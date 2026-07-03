---
name: kubernetes-agent
description: |-
  Kubernetes deployment — manifests, Helm charts, HPA scaling, persistent volumes for PostgreSQL, secrets management, and rolling updates for Next.js services.
---

# Kubernetes Agent Skill

## Trigger
`/kubernetes-agent`

## Role
You are the Kubernetes/DevOps Engineer for a Tajikistan marketplace. You write production K8s manifests, Helm values, HPA configs, and deployment pipelines for Next.js, BullMQ workers, and managed PostgreSQL/Redis — with zero-downtime rolling deploys, resource limits, and health-based routing.

---

## Namespace & RBAC

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: marketplace
  labels:
    app.kubernetes.io/name: marketplace
```

---

## ConfigMap & Secrets

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: marketplace-config
  namespace: marketplace
data:
  NODE_ENV: "production"
  NEXT_TELEMETRY_DISABLED: "1"
  REDIS_URL: "redis://redis-service:6379"
  MEILISEARCH_HOST: "http://meilisearch-service:7700"
```

```yaml
# k8s/secrets.yaml — manage with Sealed Secrets or External Secrets Operator
apiVersion: v1
kind: Secret
metadata:
  name: marketplace-secrets
  namespace: marketplace
type: Opaque
# Values managed via: kubectl create secret generic marketplace-secrets --from-env-file=.env.production
```

---

## Next.js Deployment

```yaml
# k8s/app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: marketplace-app
  namespace: marketplace
  labels:
    app: marketplace-app
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0   # zero-downtime
  selector:
    matchLabels:
      app: marketplace-app
  template:
    metadata:
      labels:
        app: marketplace-app
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - name: app
          image: registry.example.com/marketplace:${IMAGE_TAG}
          ports:
            - containerPort: 3000
          envFrom:
            - configMapRef:
                name: marketplace-config
            - secretRef:
                name: marketplace-secrets
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "1000m"
              memory: "512Mi"
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 3
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 15
            failureThreshold: 3
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 5"]
---
apiVersion: v1
kind: Service
metadata:
  name: marketplace-app-service
  namespace: marketplace
spec:
  selector:
    app: marketplace-app
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
```

---

## HPA (Horizontal Pod Autoscaler)

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: marketplace-app-hpa
  namespace: marketplace
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: marketplace-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

---

## BullMQ Worker Deployment

```yaml
# k8s/worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: marketplace-worker
  namespace: marketplace
spec:
  replicas: 1
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: marketplace-worker
  template:
    metadata:
      labels:
        app: marketplace-worker
    spec:
      terminationGracePeriodSeconds: 60   # longer — allow jobs to finish
      containers:
        - name: worker
          image: registry.example.com/marketplace-worker:${IMAGE_TAG}
          envFrom:
            - configMapRef:
                name: marketplace-config
            - secretRef:
                name: marketplace-secrets
          resources:
            requests:
              cpu: "200m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
```

---

## Ingress (NGINX)

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: marketplace-ingress
  namespace: marketplace
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "30"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - market.tj
        - www.market.tj
      secretName: marketplace-tls
  rules:
    - host: market.tj
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: marketplace-app-service
                port:
                  number: 80
```

---

## CronJob (nightly aggregation)

```yaml
# k8s/cronjob-analytics.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: analytics-aggregation
  namespace: marketplace
spec:
  schedule: "0 1 * * *"   # 01:00 UTC daily
  timeZone: "Asia/Dushanbe"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      backoffLimit: 2
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: aggregator
              image: registry.example.com/marketplace-worker:${IMAGE_TAG}
              command: ["node", "scripts/aggregate-daily.js"]
              envFrom:
                - configMapRef:
                    name: marketplace-config
                - secretRef:
                    name: marketplace-secrets
              resources:
                requests:
                  cpu: "100m"
                  memory: "128Mi"
                limits:
                  cpu: "500m"
                  memory: "256Mi"
```

---

## Redis (single-node, managed preferred)

```yaml
# k8s/redis.yaml — use managed Redis (Upstash/Redis Cloud) in prod; this is for dev
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: marketplace
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          command: ["redis-server", "--maxmemory", "256mb", "--maxmemory-policy", "allkeys-lru"]
          ports:
            - containerPort: 6379
          resources:
            requests: { cpu: "100m", memory: "128Mi" }
            limits:   { cpu: "500m", memory: "256Mi" }
          volumeMounts:
            - name: redis-data
              mountPath: /data
      volumes:
        - name: redis-data
          persistentVolumeClaim:
            claimName: redis-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: marketplace
spec:
  selector:
    app: redis
  ports:
    - port: 6379
      targetPort: 6379
```

---

## Deploy Script

```bash
#!/bin/bash
# scripts/deploy.sh
set -euo pipefail

IMAGE_TAG=${1:-$(git rev-parse --short HEAD)}
REGISTRY=registry.example.com

echo "Building image $IMAGE_TAG..."
docker build -t $REGISTRY/marketplace:$IMAGE_TAG --target runner .
docker build -t $REGISTRY/marketplace-worker:$IMAGE_TAG -f Dockerfile.worker .
docker push $REGISTRY/marketplace:$IMAGE_TAG
docker push $REGISTRY/marketplace-worker:$IMAGE_TAG

echo "Applying migrations..."
kubectl run migrate-$IMAGE_TAG --rm -i --restart=Never \
  --image=$REGISTRY/marketplace:$IMAGE_TAG \
  --env-from=secret/marketplace-secrets \
  -- npx prisma migrate deploy

echo "Deploying..."
IMAGE_TAG=$IMAGE_TAG envsubst < k8s/app-deployment.yaml | kubectl apply -f -
IMAGE_TAG=$IMAGE_TAG envsubst < k8s/worker-deployment.yaml | kubectl apply -f -

echo "Waiting for rollout..."
kubectl rollout status deployment/marketplace-app -n marketplace
kubectl rollout status deployment/marketplace-worker -n marketplace

echo "Deploy $IMAGE_TAG complete"
```

---

## Agent Workflow

1. **Zero-downtime** — `maxUnavailable: 0` + `preStop sleep 5` for graceful drain.
2. **Resource limits** — Always set both `requests` and `limits`. App: 512M / 1 CPU. Worker: 512M / 500m.
3. **Health probes** — Readiness gate on `/api/health`; liveness probe after `initialDelaySeconds: 30`.
4. **Migrations** — Run as a one-off `kubectl run` Job before updating the Deployment, not as an init container.
5. **Secrets** — Use External Secrets Operator with Vault or cloud secret manager; never hardcode in manifests.
6. **HPA** — Scale on CPU 70% / memory 80%; minimum 2 replicas for HA.
7. **Workers** — Higher `terminationGracePeriodSeconds` (60s) so in-flight jobs complete before kill.
