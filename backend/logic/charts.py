import io
import base64


def _color(p):
    if p >= 80:
        return "#10b981"
    if p >= 50:
        return "#f59e0b"
    return "#ef4444"


def generate_section_chart(sections):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    labels = [s["name"] for s in sections]
    values = [s["percentage"] for s in sections]
    if not labels:
        buf = io.BytesIO()
        plt.figure(figsize=(8.27, 1.0), dpi=96)
        plt.axis("off")
        plt.savefig(buf, format="png", bbox_inches="tight")
        plt.close()
        buf.seek(0)
        return base64.b64encode(buf.read()).decode("ascii")
    h = min(4.724, max(1.5, 0.35 * len(labels)))
    fig, ax = plt.subplots(figsize=(8.27, h), dpi=96)
    y = list(range(len(labels)))
    colors = [_color(v) for v in values]
    ax.barh(y, values, color=colors)
    ax.set_yticks(y)
    ax.set_yticklabels(labels)
    ax.set_xlim(0, 100)
    ax.invert_yaxis()
    for i, v in enumerate(values):
        ax.text(v + 1, i, f"{v}%", va="center", fontsize=9)
    plt.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format="png")
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("ascii")
