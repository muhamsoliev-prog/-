# Obscura: установка браузера (на вашем компьютере или сервере)

Источник: https://github.com/h4ckf0r0day/obscura (Apache-2.0). Скилл `SKILL.md` скопирован из `skills/obscura/SKILL.md` этого репозитория.
Скилл только учит Claude работать с Obscura. Сам браузер нужно установить отдельно.

## Windows
1. Скачайте `obscura-x86_64-windows.zip` со страницы https://github.com/h4ckf0r0day/obscura/releases
2. Распакуйте, например, в `C:\obscura`, и добавьте папку в PATH (DLL держите рядом с exe).
3. Проверка: `obscura fetch https://example.com --eval "document.title"`

## macOS / Linux
```bash
# macOS Apple Silicon: obscura-aarch64-macos.tar.gz, Linux: obscura-x86_64-linux.tar.gz
curl -LO https://github.com/h4ckf0r0day/obscura/releases/latest/download/obscura-x86_64-linux.tar.gz
tar xzf obscura-x86_64-linux.tar.gz && sudo mv obscura obscura-worker /usr/local/bin/
obscura fetch https://example.com --eval "document.title"
```

## Подключить как MCP-браузер для Claude Code
```bash
claude mcp add obscura -- obscura mcp
```

## Применение в наших проектах
- Скриншоты своего сайта на 375/768/1440 px при аудите (`--allow-private-network` для localhost).
- Мониторинг публичных цен и карточек конкурентов: только открытые страницы, уважайте правила площадок (WB, Ozon, Avito запрещают автоматический сбор в пользовательских соглашениях) и robots.txt, не перегружайте сайты; для маркетплейсов надёжнее официальные API продавца.
- Экспорт PDF смет и КП из HTML.
