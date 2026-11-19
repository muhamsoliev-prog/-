#!/usr/bin/env python3
"""Строительный калькулятор расхода материалов.

Формулы и нормы описаны в references/02-formuly-rashoda.md и references/05-fasady.md.
Все размеры в метрах, если не указано иное. Результат — JSON (удобно для сметы и сайта).

Примеры:
  calc.py beton-plita --dlina 10 --shirina 8 --tolshchina 0.25
  calc.py beton-lenta --perimetr 52 --shirina 0.4 --vysota 1.2
  calc.py armatura --diametr 12 --dlina-m 450
  calc.py gazobeton --perimetr 40 --vysota 6 --tolshchina 0.4 --proemy 18
  calc.py kirpich --ploshchad 100 --tolshchina 0.25 --tip odinarnyj
  calc.py shtukaturka --ploshchad 120 --sloj-mm 15 --tip gips
  calc.py styazhka --ploshchad 60 --tolshchina-sm 5
  calc.py plitka --ploshchad 12 --raskladka diagonal --format-mm 300x300 --shov-mm 2
  calc.py kraska --ploshchad 80 --sloev 2 --rashod-m2-na-l 9 --tara-l 9
  calc.py oboi --perimetr 16 --vysota 2.7 --shirina-rulona 1.06 --raport 0.32
  calc.py laminat --ploshchad 20 --raskladka pryamaya --m2-v-upakovke 2.13
  calc.py fasad-mokryj --ploshchad 220 --uteplitel minvata
  calc.py uteplitel-tolshchina --r-trebuemoe 3.13 --stena-tolshchina 0.3 --stena-lambda 0.14 --uteplitel-lambda 0.04
"""
from __future__ import annotations

import argparse
import json
import math
import sys

ARMATURA_KG_M = {6: 0.222, 8: 0.395, 10: 0.617, 12: 0.888, 14: 1.21, 16: 1.58, 18: 2.0, 20: 2.47}
KIRPICH_SHT_M3 = {"odinarnyj": 394, "polutornyj": 302, "dvojnoj": 200}
SHTUKATURKA_KG_M2_10MM = {"gips": 8.5, "gips-mashinnaya": 9.5, "cement": 16.0}
PLITKA_ZAPAS = {"pryamaya": 0.10, "diagonal": 0.15, "elochka": 0.15, "krupnyj-format": 0.12}
LAMINAT_ZAPAS = {"pryamaya": 0.07, "diagonal": 0.15, "elochka": 0.15}
BETON_ZAPAS = 0.05


def r(x: float, n: int = 2) -> float:
    return round(x + 0.0, n)


def beton_plita(a):
    v = a.dlina * a.shirina * a.tolshchina
    return {"obem_m3": r(v), "s_zapasom_m3": r(v * (1 + BETON_ZAPAS)), "zapas": "5%",
            "formula": "длина × ширина × толщина"}


def beton_lenta(a):
    v = a.perimetr * a.shirina * a.vysota
    return {"obem_m3": r(v), "s_zapasom_m3": r(v * (1 + BETON_ZAPAS)), "zapas": "5%",
            "formula": "периметр (вкл. внутр. несущие) × ширина × высота"}


def armatura(a):
    if a.diametr not in ARMATURA_KG_M:
        raise SystemExit(f"Диаметр {a.diametr} не в таблице: {sorted(ARMATURA_KG_M)}")
    dlina = a.dlina_m * 1.1
    kg = dlina * ARMATURA_KG_M[a.diametr]
    return {"dlina_s_nahlestom_m": r(dlina), "massa_kg": r(kg, 1), "massa_t": r(kg / 1000, 3),
            "kg_na_m": ARMATURA_KG_M[a.diametr], "zapas": "10% (нахлёсты, обрезки)",
            "provoloka_kg": r(kg / 1000 * 15, 1)}


def gazobeton(a):
    s = a.perimetr * a.vysota - a.proemy
    v = s * a.tolshchina
    blok_v = a.blok_dlina * a.blok_vysota * a.tolshchina
    sht = math.ceil(v / blok_v * 1.05)
    return {"ploshchad_sten_m2": r(s), "obem_kladki_m3": r(v), "blokov_sht": sht,
            "blokov_na_m3": r(1 / blok_v, 1), "klej_kg": r(v * 27, 0),
            "klej_meshkov_25kg": math.ceil(v * 27 / 25), "zapas": "5%"}


def kirpich(a):
    v = a.ploshchad * a.tolshchina
    sht = math.ceil(v * KIRPICH_SHT_M3[a.tip] * 1.05)
    return {"obem_kladki_m3": r(v), "kirpicha_sht": sht, "rastvor_m3": r(v * 0.24),
            "norma_sht_m3": KIRPICH_SHT_M3[a.tip], "zapas": "5%"}


def shtukaturka(a):
    kg = a.ploshchad * SHTUKATURKA_KG_M2_10MM[a.tip] * a.sloj_mm / 10 * 1.05
    return {"kg": r(kg, 0), "meshkov_30kg": math.ceil(kg / 30), "meshkov_25kg": math.ceil(kg / 25),
            "norma_kg_m2_10mm": SHTUKATURKA_KG_M2_10MM[a.tip], "zapas": "5%",
            "gruntovka_l": r(a.ploshchad * 0.15, 1)}


def styazhka(a):
    kg = a.ploshchad * 19 * a.tolshchina_sm * 1.05
    return {"cps_kg": r(kg, 0), "meshkov_40kg": math.ceil(kg / 40), "meshkov_50kg": math.ceil(kg / 50),
            "srok_sushki_dnej_orientir": int(a.tolshchina_sm * 7) if a.tolshchina_sm <= 4 else
            int(28 + (a.tolshchina_sm - 4) * 14),
            "dempfernaya_lenta": "по периметру", "zapas": "5%"}


def plitka(a):
    zapas = PLITKA_ZAPAS[a.raskladka]
    m2 = a.ploshchad * (1 + zapas)
    res = {"plitki_m2": r(m2), "zapas": f"{int(zapas * 100)}%",
           "klej_kg": r(a.ploshchad * a.klej_kg_m2, 0),
           "klej_meshkov_25kg": math.ceil(a.ploshchad * a.klej_kg_m2 / 25)}
    if a.format_mm:
        dl, sh = (float(x) for x in a.format_mm.lower().split("x"))
        sht = math.ceil(m2 / (dl * sh / 1e6))
        zatirka = (dl + sh) / (dl * sh) * a.tolshchina_mm * a.shov_mm * 1.5 * a.ploshchad
        res.update({"plitok_sht": sht, "zatirka_kg": r(zatirka, 1)})
    return res


def kraska(a):
    l = a.ploshchad * a.sloev / a.rashod_m2_na_l
    return {"litrov": r(l, 1), "tar": math.ceil(l / a.tara_l), "tara_l": a.tara_l,
            "gruntovka_l": r(a.ploshchad * 0.15, 1)}


def oboi(a):
    polosa = a.vysota + a.raport + 0.1
    polos_iz_rulona = int(a.dlina_rulona // polosa)
    if polos_iz_rulona == 0:
        raise SystemExit("Высота стены больше длины рулона")
    polos = math.ceil(a.perimetr / a.shirina_rulona)
    rulonov = math.ceil(polos / polos_iz_rulona)
    return {"polos_nuzhno": polos, "polos_iz_rulona": polos_iz_rulona, "rulonov": rulonov,
            "rulonov_s_zapasom": rulonov + 1, "podskazka": "периметр — без широких проёмов (окна, двери)"}


def laminat(a):
    zapas = LAMINAT_ZAPAS[a.raskladka]
    m2 = a.ploshchad * (1 + zapas)
    res = {"m2": r(m2), "zapas": f"{int(zapas * 100)}%", "podlozhka_m2": r(a.ploshchad * 1.05)}
    if a.m2_v_upakovke:
        res["upakovok"] = math.ceil(m2 / a.m2_v_upakovke)
    return res


def fasad_mokryj(a):
    s = a.ploshchad
    min_ = a.uteplitel == "minvata"
    return {
        "uteplitel_m2": r(s * 1.05),
        "klej_dlya_uteplitelya_kg": r(s * 5, 0),
        "dyubeli_sht": math.ceil(s * (8 if min_ else 6)),
        "armiruyushchij_klej_kg": r(s * 5, 0),
        "setka_m2": r(s * 1.15),
        "gruntovka_kg": r(s * 0.25, 1),
        "dekor_shtukaturka_kg": r(s * 3.0, 0),
        "fasadnaya_kraska_l": r(s * 0.35, 1),
        "klej_meshkov_25kg_vsego": math.ceil(s * 10 / 25),
        "primechanie": "Угловые профили и косынки на проёмы считать отдельно по периметру откосов",
    }


def uteplitel_tolshchina(a):
    r_poverhn = 1 / 8.7 + 1 / 23
    r_stena = a.stena_tolshchina / a.stena_lambda
    r_nado = a.r_trebuemoe - r_stena - r_poverhn
    if r_nado <= 0:
        return {"r_steny": r(r_stena), "vyvod": "Стена без утепления уже соответствует требованию", "tolshchina_mm": 0}
    t = r_nado * a.uteplitel_lambda
    standart = next((x for x in (50, 80, 100, 120, 150, 180, 200, 250) if x >= t * 1000), math.ceil(t * 100) * 10)
    return {"r_steny": r(r_stena), "nedostayushchee_r": r(r_nado), "raschetnaya_mm": r(t * 1000, 0),
            "rekomendovannaya_mm": standart}


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Строительный калькулятор (JSON-вывод)")
    sub = p.add_subparsers(dest="cmd", required=True)

    def add(name, fn, *args):
        sp = sub.add_parser(name)
        for flag, kw in args:
            sp.add_argument(flag, **kw)
        sp.set_defaults(fn=fn)

    F = {"type": float, "required": True}
    add("beton-plita", beton_plita, ("--dlina", F), ("--shirina", F), ("--tolshchina", F))
    add("beton-lenta", beton_lenta, ("--perimetr", F), ("--shirina", F), ("--vysota", F))
    add("armatura", armatura, ("--diametr", {"type": int, "required": True}), ("--dlina-m", F))
    add("gazobeton", gazobeton, ("--perimetr", F), ("--vysota", F), ("--tolshchina", F),
        ("--proemy", {"type": float, "default": 0}), ("--blok-dlina", {"type": float, "default": 0.625}),
        ("--blok-vysota", {"type": float, "default": 0.25}))
    add("kirpich", kirpich, ("--ploshchad", F), ("--tolshchina", F),
        ("--tip", {"choices": list(KIRPICH_SHT_M3), "default": "odinarnyj"}))
    add("shtukaturka", shtukaturka, ("--ploshchad", F), ("--sloj-mm", F),
        ("--tip", {"choices": list(SHTUKATURKA_KG_M2_10MM), "default": "gips"}))
    add("styazhka", styazhka, ("--ploshchad", F), ("--tolshchina-sm", F))
    add("plitka", plitka, ("--ploshchad", F), ("--raskladka", {"choices": list(PLITKA_ZAPAS), "default": "pryamaya"}),
        ("--format-mm", {"default": None}), ("--shov-mm", {"type": float, "default": 2}),
        ("--tolshchina-mm", {"type": float, "default": 8}), ("--klej-kg-m2", {"type": float, "default": 4}))
    add("kraska", kraska, ("--ploshchad", F), ("--sloev", {"type": int, "default": 2}),
        ("--rashod-m2-na-l", {"type": float, "default": 9}), ("--tara-l", {"type": float, "default": 9}))
    add("oboi", oboi, ("--perimetr", F), ("--vysota", F), ("--shirina-rulona", {"type": float, "default": 1.06}),
        ("--dlina-rulona", {"type": float, "default": 10.05}), ("--raport", {"type": float, "default": 0}))
    add("laminat", laminat, ("--ploshchad", F), ("--raskladka", {"choices": list(LAMINAT_ZAPAS), "default": "pryamaya"}),
        ("--m2-v-upakovke", {"type": float, "default": None}))
    add("fasad-mokryj", fasad_mokryj, ("--ploshchad", F),
        ("--uteplitel", {"choices": ["minvata", "pps"], "default": "minvata"}))
    add("uteplitel-tolshchina", uteplitel_tolshchina, ("--r-trebuemoe", F), ("--stena-tolshchina", F),
        ("--stena-lambda", F), ("--uteplitel-lambda", F))
    return p


def main(argv=None) -> int:
    a = build_parser().parse_args(argv)
    print(json.dumps(a.fn(a), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
