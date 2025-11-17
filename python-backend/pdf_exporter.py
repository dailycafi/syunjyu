"""
PDF export module
Generates PDF reports for news, concepts, and phrases
"""

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from typing import List, Dict
from datetime import datetime
import io


def generate_news_pdf(news_items: List[Dict]) -> bytes:
    """
    Generate PDF for news articles

    Args:
        news_items: List of news dictionaries

    Returns:
        PDF file as bytes
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontSize=24,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=30,
        alignment=TA_CENTER,
    )

    story.append(Paragraph("AI Daily News Report", title_style))
    story.append(Spacer(1, 0.2 * inch))

    # Metadata
    meta_style = ParagraphStyle(
        'Meta',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.grey,
        alignment=TA_CENTER,
    )
    story.append(Paragraph(f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M')}", meta_style))
    story.append(Paragraph(f"Total articles: {len(news_items)}", meta_style))
    story.append(Spacer(1, 0.5 * inch))

    # News articles
    heading_style = ParagraphStyle(
        'NewsHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#2563eb'),
        spaceAfter=6,
    )

    source_style = ParagraphStyle(
        'Source',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.grey,
        spaceAfter=6,
    )

    content_style = ParagraphStyle(
        'Content',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=12,
    )

    for idx, item in enumerate(news_items, 1):
        # Article number and title
        story.append(Paragraph(f"{idx}. {item.get('title', 'Untitled')}", heading_style))

        # Source and date
        source_text = f"Source: {item.get('source', 'Unknown')} | Date: {item.get('date', 'N/A')[:10]}"
        if item.get('starred'):
            source_text += " | ⭐ Starred"
        story.append(Paragraph(source_text, source_style))

        # Summary/content
        content = item.get('summary', '') or item.get('content_raw', '')[:500]
        if content:
            story.append(Paragraph(content, content_style))

        # URL
        url = item.get('url', '')
        if url:
            url_para = Paragraph(f'<link href="{url}">{url}</link>', source_style)
            story.append(url_para)

        story.append(Spacer(1, 0.3 * inch))

        # Page break every 3 articles for better formatting
        if idx % 3 == 0 and idx < len(news_items):
            story.append(PageBreak())

    # Build PDF
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    return pdf_bytes


def generate_concepts_pdf(concepts: List[Dict]) -> bytes:
    """
    Generate PDF for AI concepts

    Args:
        concepts: List of concept dictionaries

    Returns:
        PDF file as bytes
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontSize=24,
        alignment=TA_CENTER,
        spaceAfter=30,
    )

    story.append(Paragraph("AI Concepts Library", title_style))
    story.append(Spacer(1, 0.2 * inch))

    # Metadata
    meta_style = ParagraphStyle(
        'Meta',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.grey,
        alignment=TA_CENTER,
    )
    story.append(Paragraph(f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M')}", meta_style))
    story.append(Paragraph(f"Total concepts: {len(concepts)}", meta_style))
    story.append(Spacer(1, 0.5 * inch))

    # Concepts as table
    term_style = ParagraphStyle(
        'Term',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#1a1a1a'),
        fontName='Helvetica-Bold',
    )

    def_style = ParagraphStyle(
        'Definition',
        parent=styles['Normal'],
        fontSize=10,
    )

    # Build table data
    table_data = [['#', 'Term', 'Definition']]

    for idx, concept in enumerate(concepts, 1):
        term = Paragraph(concept.get('term', 'Unknown'), term_style)
        definition = Paragraph(concept.get('definition', 'No definition provided'), def_style)
        table_data.append([str(idx), term, definition])

    # Create table
    table = Table(table_data, colWidths=[0.5 * inch, 2 * inch, 4 * inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e5e7eb')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1a1a1a')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
    ]))

    story.append(table)

    # Build PDF
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    return pdf_bytes


def generate_phrases_pdf(phrases: List[Dict]) -> bytes:
    """
    Generate PDF for learning library phrases

    Args:
        phrases: List of phrase dictionaries

    Returns:
        PDF file as bytes
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontSize=24,
        alignment=TA_CENTER,
        spaceAfter=30,
    )

    story.append(Paragraph("Learning Library - Saved Phrases", title_style))
    story.append(Spacer(1, 0.2 * inch))

    # Metadata
    meta_style = ParagraphStyle(
        'Meta',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.grey,
        alignment=TA_CENTER,
    )
    story.append(Paragraph(f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M')}", meta_style))
    story.append(Paragraph(f"Total phrases: {len(phrases)}", meta_style))
    story.append(Spacer(1, 0.5 * inch))

    # Phrases
    phrase_style = ParagraphStyle(
        'Phrase',
        parent=styles['Normal'],
        fontSize=11,
        leftIndent=20,
        rightIndent=20,
        spaceAfter=8,
    )

    note_style = ParagraphStyle(
        'Note',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#6b7280'),
        leftIndent=20,
        spaceAfter=20,
    )

    for idx, phrase in enumerate(phrases, 1):
        # Phrase text
        text = phrase.get('text', '')
        story.append(Paragraph(f'<b>{idx}.</b> "{text}"', phrase_style))

        # Note if available
        note = phrase.get('note', '')
        if note:
            story.append(Paragraph(f"Note: {note}", note_style))

        # Date saved
        created = phrase.get('created_at', '')
        if created:
            story.append(Paragraph(f"Saved on: {created[:10]}", note_style))

        story.append(Spacer(1, 0.2 * inch))

    # Build PDF
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    return pdf_bytes
