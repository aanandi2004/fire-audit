from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape

BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR = BASE_DIR / "static"

env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"])
)

def render_pdf(context: dict) -> bytes:
    from weasyprint import HTML, CSS
    html = env.get_template("report.html").render(**context)
    css = CSS(filename=str(STATIC_DIR / "report.css"))
    pdf_bytes = HTML(string=html, base_url=str(BASE_DIR)).write_pdf(stylesheets=[css])
    return pdf_bytes
