#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MANTIQJON savollar banki — server, buyruqlar (CLI) va MCP.

Bitta fayl, faqat Python 3 standart kutubxonasi kerak.
Bank: shu papkadagi bank.json (yoki MJBANK muhit o'zgaruvchisi / --bank).

  python3 mjbank.py serve            # dastur oynasini ochadi (http://127.0.0.1:8765)
  python3 mjbank.py list --sinf 3 --ball 4
  python3 mjbank.py show S0001
  python3 mjbank.py add savol.json   # bitta savol yoki ro'yxat (JSON)
  python3 mjbank.py edit S0001 --javob C --ball 4
  python3 mjbank.py delete S0001
  python3 mjbank.py import test.mjtest --sinf 3 4 --manba "Kenguru 1999"
  python3 mjbank.py generate --sinf 3 --soni 10 10 5 --save
  python3 mjbank.py pdf T0001 test.pdf
  python3 mjbank.py mcp              # AI (Claude) uchun MCP server (stdio)

To'liq qo'llanma: AI_UCHUN.md
"""
import argparse, base64, contextlib, datetime as dt, json, os, random, re, shutil
import subprocess, sys, tempfile, threading, time, urllib.parse, webbrowser
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

HERE = os.path.dirname(os.path.abspath(__file__))
BANK = os.environ.get("MJBANK") or os.path.join(HERE, "bank.json")
APP_HTML = os.path.join(HERE, "mantiqjon_bank.html")
PORT = int(os.environ.get("MJBANK_PORT") or 8765)
BALLAR = (3, 4, 5)
HARFLAR = "ABCDE"

# ------------------------------------------------------------------ bank I/O
def bo_sh_bank():
    return {"format": "mantiqjon-bank", "versiya": 1, "savollar": [], "testlar": [],
            "sozlamalar": {"sarlavha": "Mantiqiy test", "vaqt": "50", "soni": {"3": 10, "4": 10, "5": 5}}}

_lock = threading.RLock()

@contextlib.contextmanager
def fayl_qulfi():
    """Bir vaqtda bir nechta jarayon (server, CLI, MCP) yozsa ham bank buzilmasin."""
    with _lock:
        fh = open(BANK + ".lock", "a+")
        try:
            try:
                import fcntl
                fcntl.flock(fh, fcntl.LOCK_EX)
            except ImportError:
                pass
            yield
        finally:
            fh.close()

def yukla():
    if not os.path.exists(BANK):
        return bo_sh_bank()
    with open(BANK, encoding="utf-8") as f:
        b = json.load(f)
    d = bo_sh_bank()
    for k, v in d.items():
        b.setdefault(k, v)
    return b

def saqla(b):
    tmp = BANK + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(b, f, ensure_ascii=False, indent=1)
    os.replace(tmp, BANK)

def versiya():
    try:
        return str(os.stat(BANK).st_mtime_ns)
    except FileNotFoundError:
        return "0"

@contextlib.contextmanager
def bank_ochiq():
    """with bank_ochiq() as b: ... — o'zgartirib, avtomatik saqlaydi."""
    with fayl_qulfi():
        b = yukla()
        yield b
        saqla(b)

def hozir():
    return dt.datetime.now().replace(microsecond=0).isoformat()

def yangi_id(royxat, harf):
    n = 0
    for x in royxat:
        m = re.match(harf + r"(\d+)$", str(x.get("id", "")))
        if m:
            n = max(n, int(m.group(1)))
    return "%s%04d" % (harf, n + 1)

# ------------------------------------------------------------------ savollar
class Xato(Exception):
    pass

def sinflar(v):
    if v is None or v == "":
        return []
    if isinstance(v, (int, float)):
        v = [v]
    if isinstance(v, str):
        v = re.split(r"[\s,;]+", v.strip())
    out = set()
    for x in v:
        x = str(x).strip()
        m = re.match(r"^(\d+)\s*[-–]\s*(\d+)$", x)
        if m:
            out.update(range(int(m.group(1)), int(m.group(2)) + 1))
        elif x:
            out.add(int(x))
    for s in out:
        if not 1 <= s <= 11:
            raise Xato("sinf 1 dan 11 gacha bo'lishi kerak: %s" % s)
    return sorted(out)

def tozala(q, eski=None):
    """Savolni tekshiradi va to'ldiradi."""
    q = dict(q)
    if eski:
        e = dict(eski); e.update(q); q = e
    q["sinf"] = sinflar(q.get("sinf"))
    if not q["sinf"]:
        raise Xato("savolda sinf ko'rsatilmagan (masalan sinf: [3, 4])")
    try:
        q["ball"] = int(q.get("ball"))
    except (TypeError, ValueError):
        raise Xato("ball 3, 4 yoki 5 bo'lishi kerak")
    if q["ball"] not in BALLAR:
        raise Xato("ball 3, 4 yoki 5 bo'lishi kerak")
    q["matn"] = str(q.get("matn") or "").strip("\n")
    if not q["matn"].strip():
        raise Xato("savol matni bo'sh")
    j = str(q.get("javob") or "").strip().upper()
    j = {"А": "A", "Б": "B", "В": "C", "Г": "D", "Д": "E"}.get(j, j)
    if j and j not in HARFLAR:
        raise Xato("javob A, B, C, D yoki E bo'lishi kerak")
    q["javob"] = j
    q["manba"] = str(q.get("manba") or "")
    t = q.get("teglar") or []
    if isinstance(t, str):
        t = [x.strip() for x in t.split(",")]
    q["teglar"] = [x for x in t if x]
    q["izoh"] = str(q.get("izoh") or "")
    q["rasmlar"] = dict(q.get("rasmlar") or {})
    for nom, url in q["rasmlar"].items():
        if not str(url).startswith("data:"):
            raise Xato("rasm '%s' data: URL bo'lishi kerak (base64)" % nom)
    for nom in re.findall(r"\[rasm(?:-past)?\s*:\s*([^,\]]+?)\s*(?:,[^\]]*)?\]", q["matn"]):
        if nom not in q["rasmlar"]:
            raise Xato("matnda '%s' rasmi bor, lekin rasmlar ichida yo'q" % nom)
    return q

def mos(q, sinf=None, ball=None, manba=None, qidir=None, teg=None, javobsiz=False):
    if sinf and not set(sinflar(sinf)) & set(q["sinf"]):
        return False
    if ball:
        bl = [int(x) for x in (ball if isinstance(ball, (list, tuple)) else [ball])]
        if q["ball"] not in bl:
            return False
    if manba and manba.lower() not in q.get("manba", "").lower():
        return False
    if teg and teg.lower() not in [t.lower() for t in q.get("teglar", [])]:
        return False
    if qidir:
        hay = (q["matn"] + " " + q.get("manba", "") + " " + q.get("izoh", "") + " " + q["id"]).lower()
        if qidir.lower() not in hay:
            return False
    if javobsiz and q.get("javob"):
        return False
    return True

def savollar_royxati(sinf=None, ball=None, manba=None, qidir=None, teg=None, javobsiz=False, rasmsiz=True):
    b = yukla()
    out = [q for q in b["savollar"] if mos(q, sinf, ball, manba, qidir, teg, javobsiz)]
    if rasmsiz:
        out = [dict(q, rasmlar=sorted(q.get("rasmlar", {}))) for q in out]
    return out

def savol_ol(sid):
    for q in yukla()["savollar"]:
        if q["id"] == sid:
            return q
    raise Xato("savol topilmadi: %s" % sid)

def savol_qosh(qs):
    if isinstance(qs, dict):
        qs = [qs]
    yangi = []
    with bank_ochiq() as b:
        for q in qs:
            q = tozala(q)
            q["id"] = yangi_id(b["savollar"], "S")
            q["yaratildi"] = q["ozgartirildi"] = hozir()
            b["savollar"].append(q)
            yangi.append(q["id"])
    return yangi

def savol_tahrir(sid, ozgarish, toliq=False):
    with bank_ochiq() as b:
        for i, q in enumerate(b["savollar"]):
            if q["id"] == sid:
                ozg = {k: v for k, v in ozgarish.items() if k not in ("id", "yaratildi")}
                if "rasmlar_qosh" in ozg:          # mavjud rasmlarga qo'shish
                    r = dict(q.get("rasmlar", {})); r.update(ozg.pop("rasmlar_qosh")); ozg["rasmlar"] = r
                n = tozala(ozg) if toliq else tozala(ozg, q)
                n["id"] = sid
                n["yaratildi"] = q.get("yaratildi") or hozir()
                n["ozgartirildi"] = hozir()
                b["savollar"][i] = n
                return n
    raise Xato("savol topilmadi: %s" % sid)

def savol_ochir(sid):
    with bank_ochiq() as b:
        n = len(b["savollar"])
        b["savollar"] = [q for q in b["savollar"] if q["id"] != sid]
        if len(b["savollar"]) == n:
            raise Xato("savol topilmadi: %s" % sid)
    return True

# ------------------------------------------------------------------ test matnini savollarga bo'lish
RE_Q = re.compile(r"^\s*(\d+)\s*[.)]\s*(.*)$")
RE_JAVOB = re.compile(r"^\s*(?:@javob|javob)\s*[:=]?\s*([A-EА-Д])\s*\.?\s*$", re.I)
RE_IMG = re.compile(r"\[rasm(?:-past)?\s*:\s*([^,\]]+?)\s*(?:,[^\]]*)?\]")

def matnni_bol(matn, rasmlar=None, sinf=None, manba="", kalit=None, ball=None):
    """Muharrir formatidagi butun test matnini alohida savollarga bo'ladi.
    '# 3 ballik savollar' sarlavhalari ballni belgilaydi. 'Javob: B' qatori javob.
    kalit — 'BCBBA...' yoki {1:'B',...} (test tartibidagi javoblar)."""
    rasmlar = rasmlar or {}
    joriy_ball = int(ball) if ball else None
    chiqish, q, sarlavha = [], None, ""
    def yop():
        if q:
            chiqish.append(q)
    for line in matn.splitlines():
        s = line.rstrip()
        if re.match(r"^\s*%", s):
            continue
        m = re.match(r"^\s*@(\S+)\s*(.*)$", s)
        if m and m.group(1).lower() != "javob":
            if m.group(1).lower() == "sarlavha":
                sarlavha = m.group(2).strip()
            continue
        if re.match(r"^\s*#", s):
            yop(); q = None
            mb = re.search(r"(\d+)\s*-?\s*ball", s, re.I)
            if mb:
                joriy_ball = int(mb.group(1))
            continue
        if re.match(r"^\s*\[\s*yangi\s+sahifa\s*\]\s*$", s, re.I):
            continue
        m = RE_Q.match(s)
        if m:
            yop()
            q = {"raqam": int(m.group(1)), "ball": joriy_ball, "qatorlar": [m.group(2)], "javob": ""}
            continue
        if q is None:
            continue
        mj = RE_JAVOB.match(s)
        if mj:
            q["javob"] = mj.group(1).upper(); continue
        q["qatorlar"].append(s)
    yop()
    if isinstance(kalit, str):
        kalit = [c for c in kalit.upper() if c in HARFLAR + "-?"]
    out = []
    for i, q in enumerate(chiqish):
        txt = "\n".join(q["qatorlar"]).strip("\n")
        txt = re.sub(r"\n{3,}", "\n\n", txt)
        j = q["javob"]
        if not j and kalit:
            if isinstance(kalit, dict):
                j = str(kalit.get(q["raqam"]) or kalit.get(str(q["raqam"])) or "")
            elif i < len(kalit) and kalit[i] in HARFLAR:
                j = kalit[i]
        r = {n: rasmlar[n] for n in RE_IMG.findall(txt) if n in rasmlar}
        out.append({"matn": txt, "ball": q["ball"], "javob": j, "rasmlar": r,
                    "sinf": sinf, "raqam": q["raqam"],
                    "manba": ("%s, %d-savol" % (manba, q["raqam"])) if manba else ""})
    return out, sarlavha

def import_qil(matn, rasmlar=None, sinf=None, manba="", kalit=None, ball=None, teglar=None, sinov=False):
    qs, _ = matnni_bol(matn, rasmlar, sinf, manba, kalit, ball)
    if not qs:
        raise Xato("matndan savol topilmadi ('1. ...' ko'rinishida raqamlangan savollar kerak)")
    for q in qs:
        if q["ball"] not in BALLAR:
            raise Xato("%d-savolning balli aniqlanmadi: '# 3 ballik savollar' sarlavhasini qo'ying yoki ball bering" % q["raqam"])
        if teglar:
            q["teglar"] = teglar
        q.pop("raqam", None)
    bor = {re.sub(r"\s+", " ", q["matn"]).strip() for q in yukla()["savollar"]}
    for q in qs:
        q["takror"] = re.sub(r"\s+", " ", q["matn"]).strip() in bor
    if sinov:
        return [dict(tozala({k: v for k, v in q.items() if k != "takror"}), takror=q["takror"]) for q in qs]
    yangi = [{k: v for k, v in q.items() if k != "takror"} for q in qs if not q["takror"]]
    if not yangi:
        raise Xato("bu savollarning hammasi bankda allaqachon bor")
    return savol_qosh(yangi)

# ------------------------------------------------------------------ test yaratish
def test_yarat(sinf, soni=None, sarlavha=None, sinf_yozuvi=None, vaqt=None, manba=None, teg=None,
               ishlatilmagan=False, urug=None, saqla_=False, nomi=None, kalit=True):
    b = yukla()
    sz = b.get("sozlamalar", {})
    sinf_l = sinflar(sinf)
    if not sinf_l:
        raise Xato("sinf ko'rsating")
    if soni is None:
        soni = sz.get("soni") or {"3": 10, "4": 10, "5": 5}
    if isinstance(soni, (list, tuple)):
        soni = dict(zip(["3", "4", "5"], soni))
    soni = {str(k): int(v) for k, v in soni.items()}
    rnd = random.Random(urug)
    ishlatilgan = set()
    if ishlatilmagan:
        for t in b["testlar"]:
            ishlatilgan.update(t.get("savollar", []))
    tanlangan, ogohlantirish = [], []
    for bl in BALLAR:
        kerak = soni.get(str(bl), 0)
        if kerak <= 0:
            continue
        pool = [q["id"] for q in b["savollar"] if q["ball"] == bl and mos(q, sinf_l, None, manba, None, teg)]
        yangi = [x for x in pool if x not in ishlatilgan]
        if ishlatilmagan and len(yangi) < kerak:
            ogohlantirish.append("%d ballik: ishlatilmagan savol %d ta, qolgani oldin ishlatilganlardan olindi" % (bl, len(yangi)))
            rnd.shuffle(yangi)
            qolgan = [x for x in pool if x in ishlatilgan]
            rnd.shuffle(qolgan)
            pool = yangi + qolgan
        else:
            pool = yangi if ishlatilmagan else pool
            rnd.shuffle(pool)
        if len(pool) < kerak:
            ogohlantirish.append("%d ballik savol yetmadi: %d ta kerak, bankda %d ta bor" % (bl, kerak, len(pool)))
        tanlangan += pool[:kerak]
    if not tanlangan:
        raise Xato("bu sozlamalarga mos savol topilmadi")
    if sinf_yozuvi is None:
        sinf_yozuvi = ("%d-sinf" % sinf_l[0]) if len(sinf_l) == 1 else ("%d–%d-sinflar" % (sinf_l[0], sinf_l[-1]))
    test = {"nomi": nomi or "", "sinf": sinf_l, "sarlavha": sarlavha or sz.get("sarlavha") or "Mantiqiy test",
            "sinf_yozuvi": sinf_yozuvi, "vaqt": str(vaqt if vaqt is not None else sz.get("vaqt", "50")),
            "kalit": bool(kalit), "savollar": tanlangan,
            "sozlamalar": {"soni": soni, "manba": manba or "", "teg": teg or "", "ishlatilmagan": bool(ishlatilmagan)}}
    if saqla_:
        test = test_saqla(test)
    return test, ogohlantirish

def test_saqla(test):
    with bank_ochiq() as b:
        ids = {q["id"] for q in b["savollar"]}
        for s in test.get("savollar", []):
            if s not in ids:
                raise Xato("testdagi savol bankda yo'q: %s" % s)
        t = dict(test)
        if t.get("id"):
            for i, x in enumerate(b["testlar"]):
                if x["id"] == t["id"]:
                    t["ozgartirildi"] = hozir(); t.setdefault("sana", x.get("sana"))
                    b["testlar"][i] = t
                    return t
        t["id"] = yangi_id(b["testlar"], "T")
        t["sana"] = hozir()
        if not t.get("nomi"):
            t["nomi"] = "%s — %s (%s)" % (t.get("sarlavha", "Test"), t.get("sinf_yozuvi", ""), t["id"])
        b["testlar"].append(t)
        return t

def test_ol(tid):
    for t in yukla()["testlar"]:
        if t["id"] == tid:
            return t
    raise Xato("test topilmadi: %s" % tid)

def test_ochir(tid):
    with bank_ochiq() as b:
        n = len(b["testlar"])
        b["testlar"] = [t for t in b["testlar"] if t["id"] != tid]
        if n == len(b["testlar"]):
            raise Xato("test topilmadi: %s" % tid)

def test_mjtest(t):
    """Testni muharrir (mantiqjon_muharrir.html) ochadigan .mjtest ko'rinishiga o'tkazadi."""
    b = yukla()
    by = {q["id"]: q for q in b["savollar"]}
    L = ["@sarlavha " + t["sarlavha"], "@sinf " + t["sinf_yozuvi"], "@vaqt " + (t.get("vaqt") or "yo'q"), ""]
    imgs, n, kalit = {}, 0, []
    for bl in BALLAR:
        qs = [by[s] for s in t["savollar"] if s in by and by[s]["ball"] == bl]
        if not qs:
            continue
        L += ["# %d ballik savollar" % bl, ""]
        for q in qs:
            n += 1
            m = q["matn"]
            for nom, url in q.get("rasmlar", {}).items():
                yangi = "%s_%s" % (q["id"].lower(), nom)
                imgs[yangi] = url
                m = re.sub(r"(\[rasm(?:-past)?\s*:\s*)" + re.escape(nom) + r"(\s*[,\]])", r"\g<1>" + yangi + r"\g<2>", m)
            L += ["%d. %s" % (n, m), "% " + q["id"] + (", javob: " + q["javob"] if q.get("javob") else ""), ""]
            kalit.append("%d-%s" % (n, q.get("javob") or "?"))
    L += ["% Javoblar kaliti: " + " ".join(kalit)]
    return {"format": "mantiqjon-test", "version": 1, "name": t.get("nomi") or "test", "text": "\n".join(L), "images": imgs}

# ------------------------------------------------------------------ PDF (Chrome headless)
def chrome_top():
    for n in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome", "msedge"):
        p = shutil.which(n)
        if p:
            return p
    for p in ("/opt/pw-browsers/chromium", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
              r"C:\Program Files\Google\Chrome\Application\chrome.exe"):
        if os.path.exists(p):
            return p
    return None

def pdf_qil(tid_yoki_test, chiqish):
    chrome = chrome_top()
    if not chrome:
        raise Xato("Chrome/Chromium topilmadi — PDF uchun kerak")
    srv, port = server_boshla(0, fon=True)
    try:
        if isinstance(tid_yoki_test, dict):
            key = "vaqtincha-%d" % int(time.time() * 1000)
            VAQTINCHA[key] = tid_yoki_test
            url = "http://127.0.0.1:%d/#chop=%s" % (port, key)
        else:
            test_ol(tid_yoki_test)
            url = "http://127.0.0.1:%d/#chop=%s" % (port, tid_yoki_test)
        chiqish = os.path.abspath(chiqish)
        with tempfile.TemporaryDirectory() as prof:
            cmd = [chrome, "--headless=new", "--no-sandbox", "--disable-gpu", "--user-data-dir=" + prof,
                   "--no-pdf-header-footer", "--virtual-time-budget=15000", "--run-all-compositor-stages-before-draw",
                   "--print-to-pdf=" + chiqish, url]
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
        if not os.path.exists(chiqish):
            raise Xato("PDF yaratilmadi: " + (r.stderr or "")[-400:])
        return chiqish
    finally:
        srv.shutdown()

# ------------------------------------------------------------------ HTTP server (dastur oynasi + API)
VAQTINCHA = {}

class Handler(BaseHTTPRequestHandler):
    server_version = "MantiqjonBank/1"
    def log_message(self, *a):
        pass
    def _json(self, obj, code=200):
        data = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)
    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if not n:
            return {}
        return json.loads(self.rfile.read(n).decode("utf-8"))
    def _host_ok(self):
        h = (self.headers.get("Host") or "").split(":")[0]
        return h in ("127.0.0.1", "localhost", "")
    def _route(self, method):
        if not self._host_ok():
            return self._json({"xato": "faqat shu kompyuterdan"}, 403)
        u = urllib.parse.urlparse(self.path)
        p = u.path.rstrip("/") or "/"
        qs = {k: v[-1] for k, v in urllib.parse.parse_qs(u.query).items()}
        try:
            if method == "GET" and p in ("/", "/index.html"):
                with open(APP_HTML, "rb") as f:
                    data = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                return self.wfile.write(data)
            if not p.startswith("/api/"):
                return self._json({"xato": "topilmadi"}, 404)
            parts = p[5:].split("/")
            r, arg = parts[0], (parts[1] if len(parts) > 1 else None)
            if r == "holat" and method == "GET":
                b = yukla()
                return self._json({"versiya": versiya(), "savollar": len(b["savollar"]), "testlar": len(b["testlar"]), "bank": BANK})
            if r == "bank":
                if method == "GET":
                    return self._json(dict(yukla(), _versiya=versiya()))
                if method == "PUT":
                    nb = self._body()
                    if nb.get("format") != "mantiqjon-bank":
                        raise Xato("bu bank fayli emas")
                    for q in nb.get("savollar", []):
                        tozala(q)
                    with fayl_qulfi():
                        saqla(nb)
                    return self._json({"ok": True, "versiya": versiya()})
            if r == "savollar":
                if method == "GET" and not arg:
                    return self._json(savollar_royxati(qs.get("sinf"), qs.get("ball"), qs.get("manba"), qs.get("qidir"),
                                                       qs.get("teg"), qs.get("javobsiz") == "1", qs.get("rasmsiz") != "0"))
                if method == "GET":
                    return self._json(savol_ol(arg))
                if method == "POST":
                    return self._json({"idlar": savol_qosh(self._body())})
                if method in ("PUT", "PATCH") and arg:
                    return self._json(savol_tahrir(arg, self._body(), toliq=(method == "PUT")))
                if method == "DELETE" and arg:
                    savol_ochir(arg); return self._json({"ok": True})
            if r == "import" and method == "POST":
                d = self._body()
                res = import_qil(d.get("matn", ""), d.get("rasmlar"), d.get("sinf"), d.get("manba", ""),
                                 d.get("kalit"), d.get("ball"), d.get("teglar"), bool(d.get("sinov")))
                return self._json({"natija": res})
            if r == "yarat" and method == "POST":
                d = self._body()
                t, og = test_yarat(d.get("sinf"), d.get("soni"), d.get("sarlavha"), d.get("sinf_yozuvi"), d.get("vaqt"),
                                   d.get("manba"), d.get("teg"), d.get("ishlatilmagan"), d.get("urug"),
                                   d.get("saqla"), d.get("nomi"), d.get("kalit", True))
                return self._json({"test": t, "ogohlantirish": og})
            if r == "testlar":
                if method == "GET" and not arg:
                    return self._json(yukla()["testlar"])
                if method == "GET":
                    if arg in VAQTINCHA:
                        return self._json(VAQTINCHA[arg])
                    return self._json(test_ol(arg))
                if method == "POST":
                    return self._json(test_saqla(self._body()))
                if method == "DELETE" and arg:
                    test_ochir(arg); return self._json({"ok": True})
            if r == "mjtest" and method == "GET" and arg:
                return self._json(test_mjtest(VAQTINCHA.get(arg) or test_ol(arg)))
            if r == "mjtest" and method == "POST":
                return self._json(test_mjtest(self._body()))
            return self._json({"xato": "noma'lum so'rov"}, 404)
        except Xato as e:
            return self._json({"xato": str(e)}, 400)
        except (ValueError, KeyError, TypeError) as e:
            return self._json({"xato": "noto'g'ri ma'lumot: %s" % e}, 400)
    def do_GET(self): self._route("GET")
    def do_POST(self): self._route("POST")
    def do_PUT(self): self._route("PUT")
    def do_PATCH(self): self._route("PATCH")
    def do_DELETE(self): self._route("DELETE")

def server_boshla(port, fon=False):
    srv = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    port = srv.server_address[1]
    if fon:
        threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, port

def ishlayaptimi(port):
    import urllib.request
    try:
        with urllib.request.urlopen("http://127.0.0.1:%d/api/holat" % port, timeout=1) as r:
            return r.status == 200
    except Exception:
        return False

def oyna_och(url):
    chrome = chrome_top()
    if chrome:
        try:
            subprocess.Popen([chrome, "--app=" + url, "--new-window"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return
        except Exception:
            pass
    webbrowser.open(url)

# ------------------------------------------------------------------ MCP (stdio JSON-RPC)
QOIDALAR = """SAVOL MATNI QOIDALARI (muharrir bilan bir xil):
- Savol matni oddiy qatorlar; bo'sh qator = yangi xatboshi. Raqam yozilmaydi (test yaratilganda qo'yiladi).
- Variantlar: 'A) ...' dan 'E) ...' gacha, har biri alohida qatorda.
- Rasm o'ngda: [rasm: rasm1.svg, 30%]; rasm matn tagida: [rasm-past: rasm1.svg, 60%].
- Variant rasm bo'lsa: 'A) [rasm: a.svg]' (5 ta rasmli variant bir qatorda chiqadi).
- **qalin**, *qiya*, x^{2}, a_{1}, [[KARTOCHKA]] (ramkali so'z).
- Rasmlar savolning 'rasmlar' maydonida: {"rasm1.svg": "data:image/svg+xml;base64,..."}.
SAVOL MAYDONLARI: sinf (ro'yxat, masalan [3,4]), ball (3/4/5), matn, javob (A-E), manba, teglar, izoh, rasmlar.
BUTUN TEST IMPORTI: '# 3 ballik savollar' sarlavhalari, '1. savol matni' raqamlangan savollar, ixtiyoriy 'Javob: B' qatori."""

def _sxema(props, req=()):
    return {"type": "object", "properties": props, "required": list(req)}

SAVOL_SX = {"type": "object", "description": "Savol: sinf, ball, matn, javob, manba, teglar, izoh, rasmlar"}
TOOLS = [
    ("bank_holati", "Bank haqida umumiy ma'lumot: savollar soni (sinf va ball bo'yicha), testlar soni, bank fayli joyi.", _sxema({})),
    ("qoidalar", "Savol matnini yozish qoidalari (markup) va maydonlar tavsifi.", _sxema({})),
    ("savollar_royxati", "Savollarni filtr bilan ko'rish. Rasmlar faqat nomi bilan qaytadi.",
     _sxema({"sinf": {"type": "string", "description": "masalan '3' yoki '3-4'"}, "ball": {"type": "integer"},
             "manba": {"type": "string"}, "qidir": {"type": "string", "description": "matndan qidirish"},
             "teg": {"type": "string"}, "javobsiz": {"type": "boolean", "description": "faqat javobi yo'qlar"}})),
    ("savol_olish", "Bitta savolni to'liq (rasmlari bilan) olish.", _sxema({"id": {"type": "string"}}, ["id"])),
    ("savol_qoshish", "Bankka bitta yoki bir nechta savol qo'shish. Yangi id'lar qaytadi.",
     _sxema({"savollar": {"type": "array", "items": SAVOL_SX}}, ["savollar"])),
    ("savol_tahrirlash", "Savolni tahrirlash: faqat berilgan maydonlar o'zgaradi. 'rasmlar_qosh' — mavjud rasmlarga qo'shadi.",
     _sxema({"id": {"type": "string"}, "ozgarish": SAVOL_SX}, ["id", "ozgarish"])),
    ("savol_ochirish", "Savolni bankdan o'chirish.", _sxema({"id": {"type": "string"}}, ["id"])),
    ("test_import", "Butun test matnini (muharrir formati yoki .mjtest fayli) savollarga bo'lib bankka qo'shish.",
     _sxema({"matn": {"type": "string"}, "mjtest_fayl": {"type": "string", "description": ".mjtest fayl yo'li (matn o'rniga)"},
             "sinf": {"type": "string"}, "manba": {"type": "string"},
             "kalit": {"type": "string", "description": "javoblar ketma-ket, masalan 'BEDDBBDDBC...'"},
             "teglar": {"type": "array", "items": {"type": "string"}},
             "sinov": {"type": "boolean", "description": "true bo'lsa saqlamay, natijani ko'rsatadi"}}, ["sinf"])),
    ("test_yaratish", "Bankdan yangi test yaratish (savollar aralash). saqla=true bo'lsa testlar ro'yxatiga yoziladi.",
     _sxema({"sinf": {"type": "string"}, "soni_3": {"type": "integer"}, "soni_4": {"type": "integer"}, "soni_5": {"type": "integer"},
             "sarlavha": {"type": "string"}, "sinf_yozuvi": {"type": "string"}, "vaqt": {"type": "string"},
             "manba": {"type": "string"}, "teg": {"type": "string"}, "ishlatilmagan": {"type": "boolean"},
             "urug": {"type": "integer"}, "saqla": {"type": "boolean"}, "nomi": {"type": "string"}}, ["sinf"])),
    ("testlar_royxati", "Saqlangan testlar ro'yxati.", _sxema({})),
    ("test_tahrirlash", "Saqlangan testni o'zgartirish (masalan savollar tartibi, sarlavha).",
     _sxema({"id": {"type": "string"}, "ozgarish": {"type": "object"}}, ["id", "ozgarish"])),
    ("test_ochirish", "Saqlangan testni o'chirish.", _sxema({"id": {"type": "string"}}, ["id"])),
    ("test_pdf", "Saqlangan testni PDF qilish (A4 yotiq, ikki A5, javoblar kaliti oxirida).",
     _sxema({"id": {"type": "string"}, "chiqish": {"type": "string", "description": "PDF fayl yo'li"}}, ["id", "chiqish"])),
    ("test_mjtest", "Saqlangan testni muharrir uchun .mjtest fayliga yozish.",
     _sxema({"id": {"type": "string"}, "chiqish": {"type": "string"}}, ["id", "chiqish"])),
]

def bank_holati():
    b = yukla()
    jad = {}
    for q in b["savollar"]:
        for s in q["sinf"]:
            jad.setdefault(str(s), {"3": 0, "4": 0, "5": 0})[str(q["ball"])] += 1
    return {"bank": BANK, "savollar": len(b["savollar"]), "testlar": len(b["testlar"]),
            "sinf_va_ball_boyicha": jad, "javobsiz": sum(1 for q in b["savollar"] if not q.get("javob")),
            "manbalar": sorted({re.sub(r",\s*\d+-savol$", "", q.get("manba", "")) for q in b["savollar"] if q.get("manba")})}

def tool_chaqir(nom, a):
    if nom == "bank_holati": return bank_holati()
    if nom == "qoidalar": return QOIDALAR
    if nom == "savollar_royxati":
        return [{k: q[k] for k in ("id", "sinf", "ball", "javob", "manba", "teglar", "matn", "rasmlar")}
                for q in savollar_royxati(a.get("sinf"), a.get("ball"), a.get("manba"), a.get("qidir"), a.get("teg"), a.get("javobsiz"))]
    if nom == "savol_olish": return savol_ol(a["id"])
    if nom == "savol_qoshish": return {"idlar": savol_qosh(a["savollar"])}
    if nom == "savol_tahrirlash": return savol_tahrir(a["id"], a["ozgarish"])
    if nom == "savol_ochirish": savol_ochir(a["id"]); return "o'chirildi"
    if nom == "test_import":
        matn, rasm = a.get("matn"), None
        if a.get("mjtest_fayl"):
            d = json.load(open(a["mjtest_fayl"], encoding="utf-8")); matn, rasm = d["text"], d.get("images")
        r = import_qil(matn or "", rasm, a.get("sinf"), a.get("manba", ""), a.get("kalit"), None, a.get("teglar"), a.get("sinov"))
        return r if a.get("sinov") else {"qoshildi": r}
    if nom == "test_yaratish":
        soni = {str(b): a.get("soni_%d" % b) for b in BALLAR if a.get("soni_%d" % b) is not None} or None
        t, og = test_yarat(a["sinf"], soni, a.get("sarlavha"), a.get("sinf_yozuvi"), a.get("vaqt"), a.get("manba"),
                           a.get("teg"), a.get("ishlatilmagan"), a.get("urug"), a.get("saqla"), a.get("nomi"))
        return {"test": t, "ogohlantirish": og}
    if nom == "testlar_royxati":
        return [dict({k: t.get(k) for k in ("id", "nomi", "sana", "sinf_yozuvi", "sarlavha")}, savollar_soni=len(t.get("savollar", []))) for t in yukla()["testlar"]]
    if nom == "test_tahrirlash":
        t = test_ol(a["id"]); t.update(a["ozgarish"]); t["id"] = a["id"]; return test_saqla(t)
    if nom == "test_ochirish": test_ochir(a["id"]); return "o'chirildi"
    if nom == "test_pdf": return {"pdf": pdf_qil(a["id"], a["chiqish"])}
    if nom == "test_mjtest":
        d = test_mjtest(test_ol(a["id"]))
        json.dump(d, open(a["chiqish"], "w", encoding="utf-8"), ensure_ascii=False); return {"fayl": os.path.abspath(a["chiqish"])}
    raise Xato("noma'lum asbob: " + nom)

def mcp_ishga():
    def yoz(o):
        sys.stdout.write(json.dumps(o, ensure_ascii=False) + "\n"); sys.stdout.flush()
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
        except ValueError:
            continue
        mid, m = msg.get("id"), msg.get("method")
        if mid is None:
            continue                      # bildirishnoma
        try:
            if m == "initialize":
                res = {"protocolVersion": (msg.get("params") or {}).get("protocolVersion", "2024-11-05"),
                       "capabilities": {"tools": {}},
                       "serverInfo": {"name": "mantiqjon-bank", "version": "1.0"},
                       "instructions": "MANTIQJON savollar banki. Avval 'qoidalar' va 'bank_holati' ni chaqiring."}
            elif m == "ping":
                res = {}
            elif m == "tools/list":
                res = {"tools": [{"name": n, "description": d, "inputSchema": s} for n, d, s in TOOLS]}
            elif m == "tools/call":
                p = msg.get("params") or {}
                try:
                    r = tool_chaqir(p.get("name"), p.get("arguments") or {})
                    txt = r if isinstance(r, str) else json.dumps(r, ensure_ascii=False, indent=1)
                    res = {"content": [{"type": "text", "text": txt}]}
                except (Xato, KeyError, ValueError, OSError) as e:
                    res = {"content": [{"type": "text", "text": "Xato: %s" % e}], "isError": True}
            else:
                yoz({"jsonrpc": "2.0", "id": mid, "error": {"code": -32601, "message": "method not found"}}); continue
            yoz({"jsonrpc": "2.0", "id": mid, "result": res})
        except Exception as e:
            yoz({"jsonrpc": "2.0", "id": mid, "error": {"code": -32603, "message": str(e)}})

# ------------------------------------------------------------------ CLI
def chiqar(o):
    print(o if isinstance(o, str) else json.dumps(o, ensure_ascii=False, indent=1))

def main(argv=None):
    global BANK
    ap = argparse.ArgumentParser(prog="mjbank.py", description="MANTIQJON savollar banki")
    ap.add_argument("--bank", help="bank.json yo'li")
    sp = ap.add_subparsers(dest="cmd")
    s = sp.add_parser("serve", help="dastur oynasini ochish"); s.add_argument("--port", type=int, default=PORT); s.add_argument("--ochma", action="store_true", help="oynani ochmaslik")
    s = sp.add_parser("stats", help="bank holati")
    s = sp.add_parser("rules", help="savol yozish qoidalari")
    s = sp.add_parser("list", help="savollar ro'yxati")
    for k in ("--sinf", "--manba", "--qidir", "--teg"): s.add_argument(k)
    s.add_argument("--ball", type=int); s.add_argument("--javobsiz", action="store_true"); s.add_argument("--json", action="store_true")
    s = sp.add_parser("show", help="bitta savol (to'liq JSON)"); s.add_argument("id"); s.add_argument("--rasmsiz", action="store_true")
    s = sp.add_parser("add", help="JSON fayldan savol(lar) qo'shish ('-' = stdin)"); s.add_argument("fayl")
    s = sp.add_parser("edit", help="savolni tahrirlash"); s.add_argument("id")
    for k in ("--matn", "--matn-fayl", "--javob", "--ball", "--manba", "--izoh", "--teglar", "--json"): s.add_argument(k)
    s.add_argument("--sinf", nargs="+"); s.add_argument("--rasm", nargs=2, action="append", metavar=("NOM", "FAYL"), help="rasm qo'shish/almashtirish")
    s = sp.add_parser("delete", help="savolni o'chirish"); s.add_argument("id")
    s = sp.add_parser("import", help=".mjtest yoki matn fayldan butun testni import qilish"); s.add_argument("fayl")
    s.add_argument("--sinf", nargs="+", required=True); s.add_argument("--manba", default=""); s.add_argument("--kalit"); s.add_argument("--ball", type=int)
    s.add_argument("--teglar"); s.add_argument("--sinov", action="store_true", help="saqlamasdan ko'rsatish")
    s = sp.add_parser("generate", help="yangi test yaratish"); s.add_argument("--sinf", nargs="+", required=True)
    s.add_argument("--soni", nargs=3, type=int, metavar=("N3", "N4", "N5")); s.add_argument("--sarlavha"); s.add_argument("--sinf-yozuvi"); s.add_argument("--vaqt")
    s.add_argument("--manba"); s.add_argument("--teg"); s.add_argument("--ishlatilmagan", action="store_true"); s.add_argument("--urug", type=int)
    s.add_argument("--save", action="store_true"); s.add_argument("--nomi"); s.add_argument("--pdf"); s.add_argument("--mjtest")
    s = sp.add_parser("tests", help="saqlangan testlar")
    s = sp.add_parser("delete-test", help="testni o'chirish"); s.add_argument("id")
    s = sp.add_parser("pdf", help="testni PDF qilish"); s.add_argument("id"); s.add_argument("chiqish")
    s = sp.add_parser("mjtest", help="testni .mjtest (muharrir) qilish"); s.add_argument("id"); s.add_argument("chiqish")
    s = sp.add_parser("mcp", help="MCP server (stdio) — Claude va boshqa AI uchun")
    a = ap.parse_args(argv)
    if a.bank:
        BANK = os.path.abspath(a.bank)
    try:
        if a.cmd in (None, "serve"):
            port = getattr(a, "port", PORT)
            url = "http://127.0.0.1:%d/" % port
            if ishlayaptimi(port):
                if not getattr(a, "ochma", False): oyna_och(url)
                print("Server allaqachon ishlayapti:", url); return
            srv, port = server_boshla(port)
            print("MANTIQJON savollar banki:", url, "\nBank:", BANK, "\nTo'xtatish: Ctrl+C")
            if not getattr(a, "ochma", False):
                threading.Timer(0.6, oyna_och, [url]).start()
            try: srv.serve_forever()
            except KeyboardInterrupt: pass
        elif a.cmd == "stats": chiqar(bank_holati())
        elif a.cmd == "rules": chiqar(QOIDALAR)
        elif a.cmd == "list":
            qs = savollar_royxati(a.sinf, a.ball, a.manba, a.qidir, a.teg, a.javobsiz)
            if a.json: chiqar(qs)
            else:
                for q in qs:
                    birinchi = re.sub(r"\s+", " ", q["matn"].split("\n")[0])[:90]
                    print("%s  %s-sinf  %d ball  javob:%s  %s\n        %s" % (q["id"], ",".join(map(str, q["sinf"])), q["ball"], q["javob"] or "?", q["manba"], birinchi))
                print("Jami:", len(qs))
        elif a.cmd == "show":
            q = savol_ol(a.id)
            if a.rasmsiz: q = dict(q, rasmlar=sorted(q.get("rasmlar", {})))
            chiqar(q)
        elif a.cmd == "add":
            d = json.load(sys.stdin if a.fayl == "-" else open(a.fayl, encoding="utf-8"))
            chiqar({"qoshildi": savol_qosh(d)})
        elif a.cmd == "edit":
            o = json.loads(a.json) if a.json else {}
            if a.matn is not None: o["matn"] = a.matn.replace("\\n", "\n")
            if a.matn_fayl: o["matn"] = open(a.matn_fayl, encoding="utf-8").read()
            for k in ("javob", "ball", "manba", "izoh", "teglar"):
                if getattr(a, k) is not None: o[k] = getattr(a, k)
            if a.sinf: o["sinf"] = a.sinf
            if a.rasm:
                import mimetypes
                r = {}
                for nom, f in a.rasm:
                    mt = mimetypes.guess_type(f)[0] or "image/png"
                    r[nom] = "data:%s;base64,%s" % (mt, base64.b64encode(open(f, "rb").read()).decode())
                o["rasmlar_qosh"] = r
            q = savol_tahrir(a.id, o); chiqar(dict(q, rasmlar=sorted(q["rasmlar"])))
        elif a.cmd == "delete": savol_ochir(a.id); print("o'chirildi:", a.id)
        elif a.cmd == "import":
            if a.fayl.endswith(".mjtest") or a.fayl.endswith(".json"):
                d = json.load(open(a.fayl, encoding="utf-8")); matn, rasm = d["text"], d.get("images")
            else:
                matn, rasm = open(a.fayl, encoding="utf-8").read(), None
            r = import_qil(matn, rasm, a.sinf, a.manba, a.kalit, a.ball, a.teglar, a.sinov)
            if a.sinov:
                for q in r: print("%d ball  javob:%s  %s%s" % (q["ball"], q["javob"] or "?", "[bankda bor] " if q.get("takror") else "", q["matn"].split("\n")[0][:80]))
                print("Jami:", len(r), "(saqlanmadi)")
            else: chiqar({"qoshildi": r})
        elif a.cmd == "generate":
            t, og = test_yarat(a.sinf, a.soni, a.sarlavha, a.sinf_yozuvi, a.vaqt, a.manba, a.teg, a.ishlatilmagan, a.urug,
                               a.save or bool(a.pdf), a.nomi)
            for x in og: print("Ogohlantirish:", x, file=sys.stderr)
            chiqar(t)
            if a.pdf: print("PDF:", pdf_qil(t["id"], a.pdf))
            if a.mjtest:
                json.dump(test_mjtest(t), open(a.mjtest, "w", encoding="utf-8"), ensure_ascii=False); print("mjtest:", a.mjtest)
        elif a.cmd == "tests":
            for t in yukla()["testlar"]:
                print("%s  %s  %s  %d savol" % (t["id"], t.get("sana", ""), t.get("nomi", ""), len(t.get("savollar", []))))
        elif a.cmd == "delete-test": test_ochir(a.id); print("o'chirildi:", a.id)
        elif a.cmd == "pdf": print(pdf_qil(a.id, a.chiqish))
        elif a.cmd == "mjtest":
            json.dump(test_mjtest(test_ol(a.id)), open(a.chiqish, "w", encoding="utf-8"), ensure_ascii=False); print(a.chiqish)
        elif a.cmd == "mcp": mcp_ishga()
    except Xato as e:
        print("Xato:", e, file=sys.stderr); sys.exit(1)

if __name__ == "__main__":
    main()
