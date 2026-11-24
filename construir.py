# Arma DOS apps desde app.html:
#   index.html          → la del EQUIPO (sin nada de control: ni código ni pantallas)
#   control/index.html  → la de CONTROL (solo ver y asignar videógrafo), con su propio manifest, sw.js e iconos
# En app.html: §CTL{ … }CTL§ solo va en Control; §CREW{ … }CREW§ solo va en la del equipo.
import json, pathlib, re, shutil
p = pathlib.Path(__file__).parent
datos = json.dumps(json.loads((p/"planos.json").read_text(encoding="utf-8")), ensure_ascii=False).replace("</", "<\\/")
src = (p/"app.html").read_text(encoding="utf-8").replace("/*DATOS*/", datos)

VER_EQ, VER_CT = "rodaje-v110", "control-v107"
def armar(control):
    quitar, dejar = ("CREW", "CTL") if control else ("CTL", "CREW")
    s = re.sub(r"§%s\{.*?\}%s§" % (quitar, quitar), "", src, flags=re.S)
    s = re.sub(r"§%s\{(.*?)\}%s§" % (dejar, dejar), r"\1", s, flags=re.S)
    assert "§" not in s
    return s.replace("/*VER*/", VER_CT if control else VER_EQ)

(p/"index.html").write_text(armar(False), encoding="utf-8")
c = armar(True)
for o, n in [('const CLAVE = "plan-rodaje-cst";', 'const CLAVE = "plan-rodaje-ctl";'), ('const FUENTE = "planos.json";', 'const FUENTE = "../planos.json";'),
             ("<title>Plan de rodaje</title>", "<title>Control de rodaje</title>"), ('content="Rodaje"', 'content="Control"')]:
    assert c.count(o) == 1, o
    c = c.replace(o, n)
d = p/"control"; d.mkdir(exist_ok=True)
(d/"index.html").write_text(c, encoding="utf-8")
# (Control tiene su propio ícono: no se copia el del equipo)
m = json.loads((p/"manifest.webmanifest").read_text(encoding="utf-8")); m["name"] = "Control · Cali Somos Todos"; m["short_name"] = "Control"
(d/"manifest.webmanifest").write_text(json.dumps(m, ensure_ascii=False, indent=2), encoding="utf-8")
sw = (p/"sw.js").read_text(encoding="utf-8"); assert 'const CACHE = "%s";' % VER_EQ in sw
(d/"sw.js").write_text(sw.replace('const CACHE = "%s";' % VER_EQ, 'const CACHE = "%s";' % VER_CT), encoding="utf-8")
print("index.html (equipo) y control/ listos")
