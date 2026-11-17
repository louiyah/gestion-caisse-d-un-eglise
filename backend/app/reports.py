"""Génération des rapports : PDF (mouvement de caisse), Excel et histogramme."""
import io
from datetime import date

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from openpyxl import Workbook  # noqa: E402
from openpyxl.styles import Alignment, Font, PatternFill  # noqa: E402
from reportlab.lib import colors  # noqa: E402
from reportlab.lib.pagesizes import A4  # noqa: E402
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet  # noqa: E402
from reportlab.lib.units import cm  # noqa: E402
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle  # noqa: E402


def ar(n: int) -> str:
    """Format malgache : 325000 -> '325.000 Ar'."""
    return f"{n:,}".replace(",", ".") + " Ar"


def fd(d: date) -> str:
    return d.strftime("%d-%m-%Y")


def _table(lignes, entete):
    data = [entete] + lignes
    t = Table(data, colWidths=[3.5 * cm, 7 * cm, 4 * cm], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (2, 0), (2, -1), "RIGHT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F1F5F9")]),
    ]))
    return t


def generer_pdf(entrees: list[dict], sorties: list[dict], debut: date, fin: date, eglise: str | None) -> bytes:
    """PDF au format de l'exemple du sujet (entrées, total, sorties, total)."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm,
                            topMargin=2 * cm, bottomMargin=2 * cm, title="Mouvement de caisse")
    styles = getSampleStyleSheet()
    titre = ParagraphStyle("t", parent=styles["Title"], fontSize=18)
    normal = styles["Normal"]
    gras = ParagraphStyle("g", parent=normal, fontName="Helvetica-Bold", spaceBefore=6)

    total_in = sum(e["montant"] for e in entrees)
    total_out = sum(s["montant"] for s in sorties)

    el = [Paragraph("Mouvement de caisse", titre)]
    if eglise:
        el.append(Paragraph(f"Église : {eglise}", normal))
    el += [Paragraph(f"Entre {fd(debut)} et {fd(fin)}", normal), Spacer(1, 12),
           Paragraph("Mouvement d'entrée en caisse", gras), Spacer(1, 4)]
    el.append(_table([[fd(e["date"]), e["motif"], ar(e["montant"])] for e in entrees]
                     or [["—", "Aucune entrée", "—"]], ["Date d'entrée", "Motif", "Montant"]))
    el += [Spacer(1, 8), Paragraph(f"Total Montant entrant : {ar(total_in)}", gras), Spacer(1, 16),
           Paragraph("Mouvement de sortie de caisse", gras), Spacer(1, 4)]
    el.append(_table([[fd(s["date"]), s["motif"], ar(s["montant"])] for s in sorties]
                     or [["—", "Aucune sortie", "—"]], ["Date de sortie", "Motif", "Montant"]))
    el += [Spacer(1, 8), Paragraph(f"Total Montant sortant : {ar(total_out)}", gras), Spacer(1, 12),
           Paragraph(f"Solde de la période : {ar(total_in - total_out)}", gras)]
    doc.build(el)
    return buf.getvalue()


def generer_excel(entrees: list[dict], sorties: list[dict], debut: date, fin: date) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Mouvements"
    ws.append([f"Mouvement de caisse du {fd(debut)} au {fd(fin)}"])
    ws["A1"].font = Font(bold=True, size=14)
    ws.append([])
    head_fill = PatternFill("solid", fgColor="1E3A8A")

    def bloc(titre, lignes, total_label):
        ws.append([titre])
        ws.cell(ws.max_row, 1).font = Font(bold=True)
        ws.append(["Date", "Motif", "Montant (Ar)"])
        for c in ws[ws.max_row]:
            c.font = Font(bold=True, color="FFFFFF")
            c.fill = head_fill
        for l in lignes:
            ws.append([l["date"], l["motif"], l["montant"]])
            ws.cell(ws.max_row, 1).number_format = "DD-MM-YYYY"
            ws.cell(ws.max_row, 3).number_format = '#,##0'
        ws.append(["", total_label, sum(l["montant"] for l in lignes)])
        ws.cell(ws.max_row, 2).font = Font(bold=True)
        ws.cell(ws.max_row, 3).font = Font(bold=True)
        ws.cell(ws.max_row, 3).number_format = '#,##0'
        ws.append([])

    bloc("Entrées en caisse", entrees, "Total Montant entrant")
    bloc("Sorties de caisse", sorties, "Total Montant sortant")
    ws.column_dimensions["A"].width = 14
    ws.column_dimensions["B"].width = 38
    ws.column_dimensions["C"].width = 18
    for row in ws.iter_rows():
        row[2].alignment = Alignment(horizontal="right")
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def histogramme(libelles: list[str], entrees: list[int], sorties: list[int], titre: str) -> bytes:
    """Histogramme groupé Entrées / Sorties par église (ou par mois)."""
    fig, ax = plt.subplots(figsize=(8, 4.5), dpi=120)
    n = len(libelles)
    x = range(n)
    w = 0.38
    ax.bar([i - w / 2 for i in x], entrees, w, label="Entrées", color="#2563EB")
    ax.bar([i + w / 2 for i in x], sorties, w, label="Sorties", color="#DC2626")
    ax.set_xticks(list(x))
    ax.set_xticklabels(libelles, rotation=15, ha="right")
    ax.set_ylabel("Montant (Ar)")
    ax.set_title(titre)
    ax.legend()
    ax.yaxis.set_major_formatter(lambda v, _: f"{int(v):,}".replace(",", "."))
    ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format="png")
    plt.close(fig)
    return buf.getvalue()
