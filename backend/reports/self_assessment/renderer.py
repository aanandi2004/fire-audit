from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape

BASE_DIR = Path(__file__).resolve().parent.parent.parent
TEMPLATES_DIR = BASE_DIR / "templates" / "self_assessment"
STATIC_DIR = BASE_DIR / "static"

env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"])
)

def render_html(report: dict) -> str:
    html = env.get_template("base.html").render(**report)
    charts_ctx = {
        "overall": {
            "percentage": report["charts_overall"]["percentage"],
            "categories": report["charts_overall"]["categories"],
            "questions": report["charts_overall"]["questions"],
        },
        "category_compliance": [{"name": c["label"], "percentage": c["percentage"]} for c in report["category_compliance"]],
        "status_distribution": [
            {"label": "In Place", "count": report["status_distribution"]["in_place"], "color": "#16a34a", "percent": report["status_distribution"]["in_place_percent"]},
            {"label": "Partially In Place", "count": report["status_distribution"]["partial"], "color": "#f59e0b", "percent": report["status_distribution"]["partial_percent"]},
            {"label": "Not In Place", "count": report["status_distribution"]["not_in_place"], "color": "#ef4444", "percent": report["status_distribution"]["not_in_place_percent"]},
            {"label": "Not Relevant", "count": report["status_distribution"]["not_relevant"], "color": "#2563eb", "percent": report["status_distribution"]["not_relevant_percent"]},
        ],
    }
    charts_html = env.get_template("summary_charts.html").render(**charts_ctx)
    return html + charts_html

def render_pdf(report: dict) -> bytes:
    from weasyprint import HTML, CSS
    html = render_html(report)
    pdf = HTML(string=html, base_url=str(BASE_DIR)).write_pdf(stylesheets=[CSS(filename=str(STATIC_DIR / "report.css"))])
    return pdf
