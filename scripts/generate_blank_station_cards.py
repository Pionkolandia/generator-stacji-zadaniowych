from pathlib import Path

from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "assets" / "materials" / "czysta-karta-stacji-zadaniowych.pdf"

BLUE = HexColor("#2949E8")
BLUE_DEEP = HexColor("#17328F")
BLUE_SOFT = HexColor("#EEF2FF")
ORANGE = HexColor("#F56820")
ORANGE_DEEP = HexColor("#9D3B0C")
ORANGE_SOFT = HexColor("#FFF2E9")
INK = HexColor("#17213F")
MUTED = HexColor("#5D6888")
LINE = HexColor("#D9E0F1")


def register_fonts():
    font_dir = Path("/System/Library/Fonts/Supplemental")
    pdfmetrics.registerFont(TTFont("Arial", str(font_dir / "Arial.ttf")))
    pdfmetrics.registerFont(TTFont("Arial-Bold", str(font_dir / "Arial Bold.ttf")))
    pdfmetrics.registerFont(TTFont("Arial-Black", str(font_dir / "Arial Black.ttf")))


def draw_line(c, x1, y1, x2, y2, color=INK, width=0.8):
    c.setStrokeColor(color)
    c.setLineWidth(width)
    c.line(x1, y1, x2, y2)


def draw_text(c, value, x, y, size, color=INK, font="Arial-Bold"):
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawString(x, y, value)


def draw_centered(c, value, x, y, width, size, color=INK, font="Arial-Bold"):
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawCentredString(x + width / 2, y, value)


def rounded_box(c, x, y, width, height, stroke, fill=white, radius=3 * mm, line_width=1):
    c.setStrokeColor(stroke)
    c.setFillColor(fill)
    c.setLineWidth(line_width)
    c.roundRect(x, y, width, height, radius, stroke=1, fill=1)


def draw_station(c, x, y, width, height, accent, accent_deep, accent_soft):
    rounded_box(c, x, y, width, height, LINE, white, 3 * mm, 0.9)
    pad = 4 * mm
    top = y + height

    tag_w = 34 * mm
    tag_h = 8.5 * mm
    tag_y = top - tag_h - 3.5 * mm
    rounded_box(c, x + pad, tag_y, tag_w, tag_h, accent, accent, 2.2 * mm, 0.8)
    draw_text(c, "STACJA", x + pad + 3 * mm, tag_y + 2.45 * mm, 7.8, white, "Arial-Black")
    draw_line(c, x + pad + 19 * mm, tag_y + 2.35 * mm, x + pad + 31 * mm, tag_y + 2.35 * mm, white, 1)

    title_label_y = tag_y - 6.5 * mm
    draw_centered(c, "TYTUŁ GRY", x + pad, title_label_y, width - 2 * pad, 8.3, accent_deep, "Arial-Black")
    draw_line(c, x + pad + 3 * mm, title_label_y - 3.2 * mm, x + width - pad - 3 * mm, title_label_y - 3.2 * mm, accent_deep, 1)

    tasks_label_y = title_label_y - 12 * mm
    draw_text(c, "NUMERY ZADAŃ:", x + pad, tasks_label_y, 7.2, MUTED, "Arial-Black")

    boxes_y = tasks_label_y - 10.5 * mm
    gap = 1.4 * mm
    usable = width - 2 * pad
    box_w = (usable - 5 * gap) / 6
    for index in range(6):
        rounded_box(
            c,
            x + pad + index * (box_w + gap),
            boxes_y,
            box_w,
            9 * mm,
            LINE,
            accent_soft,
            1.8 * mm,
            0.7,
        )

    separator_y = y + 20 * mm
    c.setDash(2, 2)
    draw_line(c, x + pad, separator_y, x + width - pad, separator_y, LINE, 0.7)
    c.setDash()

    draw_text(c, "ZADANIA:", x + pad, y + 13.5 * mm, 8.2, INK, "Arial-Black")
    draw_line(c, x + pad + 19 * mm, y + 13.1 * mm, x + width - pad, y + 13.1 * mm, INK, 0.9)

    time_y = y + 7.2 * mm
    draw_text(c, "CZAS:", x + pad, time_y, 8.2, INK, "Arial-Black")
    first_line_x = x + pad + 16 * mm
    field_w = 12 * mm
    draw_line(c, first_line_x, time_y + 1.3 * mm, first_line_x + field_w, time_y + 1.3 * mm, INK, 0.9)
    draw_centered(c, "MINUTY", first_line_x, y + 3.1 * mm, field_w, 6.4, INK, "Arial-Bold")
    second_line_x = first_line_x + 18 * mm
    draw_line(c, second_line_x, time_y + 1.3 * mm, second_line_x + field_w, time_y + 1.3 * mm, INK, 0.9)
    draw_centered(c, "SEKUNDY", second_line_x, y + 3.1 * mm, field_w, 6.4, INK, "Arial-Bold")


def draw_total_count(c, x, y, width, height, color):
    rounded_box(c, x, y, width, height, color, white, 2.8 * mm, 1.1)
    label = "ŁĄCZNA LICZBA ZADAŃ:"
    draw_text(c, label, x + 4 * mm, y + 4.4 * mm, 8.2, color, "Arial-Black")
    label_width = pdfmetrics.stringWidth(label, "Arial-Black", 8.2)
    draw_line(c, x + 4 * mm + label_width + 3 * mm, y + 4.1 * mm, x + width - 5 * mm, y + 4.1 * mm, color, 0.9)


def draw_total_time(c, x, y, width, height, color):
    rounded_box(c, x, y, width, height, color, white, 2.8 * mm, 1.1)
    draw_text(c, "ŁĄCZNY CZAS:", x + 4 * mm, y + 5.2 * mm, 8.2, color, "Arial-Black")
    first_line_x = x + 34 * mm
    field_w = 14 * mm
    draw_line(c, first_line_x, y + 7.2 * mm, first_line_x + field_w, y + 7.2 * mm, color, 0.9)
    draw_centered(c, "MINUTY", first_line_x, y + 2.6 * mm, field_w, 6.2, color, "Arial-Bold")
    second_line_x = first_line_x + 23 * mm
    draw_line(c, second_line_x, y + 7.2 * mm, second_line_x + field_w, y + 7.2 * mm, color, 0.9)
    draw_centered(c, "SEKUNDY", second_line_x, y + 2.6 * mm, field_w, 6.2, color, "Arial-Bold")


def draw_card(c, x, y, width, height, player):
    is_b = player == "B"
    accent = ORANGE if is_b else BLUE
    accent_deep = ORANGE_DEEP if is_b else BLUE_DEEP
    accent_soft = ORANGE_SOFT if is_b else BLUE_SOFT
    rounded_box(c, x, y, width, height, accent, white, 4 * mm, 1.8)

    left = x + 6 * mm
    right = x + width - 6 * mm
    top = y + height
    header_line_y = top - 32 * mm

    draw_text(c, "STACJE ZADANIOWE", left, top - 11 * mm, 14, BLUE, "Arial-Black")
    draw_text(c, "KARTA GRACZA", left, top - 17.2 * mm, 8.4, INK, "Arial-Black")
    draw_text(c, "SZKOŁA JEST SMART!", left, top - 22.3 * mm, 7.2, MUTED, "Arial-Black")

    meta_x = x + 71 * mm
    draw_text(c, "IMIĘ I NAZWISKO", meta_x, top - 8.2 * mm, 8.4, INK, "Arial-Black")
    draw_line(c, meta_x, top - 14.2 * mm, right, top - 14.2 * mm, INK, 1)

    meta_y = top - 27 * mm
    player_w = 32 * mm
    rounded_box(c, meta_x, meta_y, player_w, 9.5 * mm, accent, accent, 4.75 * mm, 0.5)
    draw_centered(c, f"GRACZ {player}", meta_x, meta_y + 2.8 * mm, player_w, 8.2, white, "Arial-Black")

    pair_x = meta_x + player_w + 5 * mm
    pair_w = 43 * mm
    rounded_box(c, pair_x, meta_y, pair_w, 9.5 * mm, accent_soft, accent_soft, 4.75 * mm, 0.5)
    draw_text(c, "NUMER PARY", pair_x + 4 * mm, meta_y + 2.8 * mm, 7.4, accent_deep, "Arial-Black")
    draw_line(c, pair_x + 27 * mm, meta_y + 2.7 * mm, pair_x + 38 * mm, meta_y + 2.7 * mm, accent_deep, 0.9)

    draw_line(c, left, header_line_y, right, header_line_y, LINE, 1.2)

    stations_y = y + 25 * mm
    stations_h = 72 * mm
    station_gap = 3 * mm
    station_w = (width - 12 * mm - 2 * station_gap) / 3
    for index in range(3):
        draw_station(
            c,
            left + index * (station_w + station_gap),
            stations_y,
            station_w,
            stations_h,
            accent,
            accent_deep,
            accent_soft,
        )

    total_y = y + 5 * mm
    total_h = 14 * mm
    total_gap = 3 * mm
    total_w = (width - 12 * mm - total_gap) / 2
    draw_total_count(c, left, total_y, total_w, total_h, accent_deep)
    draw_total_time(c, left + total_w + total_gap, total_y, total_w, total_h, accent_deep)


def create_pdf():
    register_fonts()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
    c.setTitle("Pusta karta stacji zadaniowych - gracze A i B")
    c.setAuthor("Szkoła jest SMART!")
    c.setSubject("Puste karty do samodzielnego wpisania gier i numerów zadań")

    page_w, _ = A4
    margin = 10 * mm
    gap = 9 * mm
    card_h = 134 * mm
    card_w = page_w - 2 * margin
    draw_card(c, margin, margin + card_h + gap, card_w, card_h, "A")
    draw_card(c, margin, margin, card_w, card_h, "B")
    c.showPage()
    c.save()
    print(OUTPUT)


if __name__ == "__main__":
    create_pdf()
