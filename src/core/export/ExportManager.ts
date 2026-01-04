/**
 * Export Manager
 *
 * Handles exporting diagrams to various formats:
 * - PNG (high-resolution raster image)
 * - SVG (scalable vector graphics)
 * - PDF (document with title block)
 */

import Konva from 'konva';
import { Diagram } from '../../types';

// ============================================================================
// Types
// ============================================================================

export interface ExportOptions {
  /** Export quality/resolution multiplier (default: 2 for high DPI) */
  pixelRatio?: number;
  /** Background color (default: white) */
  backgroundColor?: string;
  /** Include title block in export */
  includeTitleBlock?: boolean;
  /** Paper size for PDF export */
  paperSize?: 'A4' | 'A3' | 'A2' | 'A1' | 'A0' | 'Letter' | 'Legal' | 'Tabloid';
  /** Paper orientation */
  orientation?: 'portrait' | 'landscape';
  /** Margin in mm */
  margin?: number;
}

export interface TitleBlockInfo {
  title: string;
  subtitle?: string;
  revision: string;
  date: string;
  author: string;
  sheetNumber?: string;
  totalSheets?: number;
  facility?: string;
  system?: string;
  scale?: string;
}

const DEFAULT_OPTIONS: ExportOptions = {
  pixelRatio: 2,
  backgroundColor: '#ffffff',
  includeTitleBlock: true,
  paperSize: 'A3',
  orientation: 'landscape',
  margin: 10,
};

// Paper sizes in mm
const PAPER_SIZES: Record<string, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  A2: { width: 420, height: 594 },
  A1: { width: 594, height: 841 },
  A0: { width: 841, height: 1189 },
  Letter: { width: 216, height: 279 },
  Legal: { width: 216, height: 356 },
  Tabloid: { width: 279, height: 432 },
};

// ============================================================================
// Export Manager Class
// ============================================================================

export class ExportManager {
  private stage: Konva.Stage | null = null;
  private diagram: Diagram | null = null;

  /**
   * Set the Konva stage for export
   */
  setStage(stage: Konva.Stage | null): void {
    this.stage = stage;
  }

  /**
   * Set the diagram for export metadata
   */
  setDiagram(diagram: Diagram | null): void {
    this.diagram = diagram;
  }

  /**
   * Export to PNG image
   */
  async exportToPNG(options: ExportOptions = {}): Promise<Blob | null> {
    if (!this.stage) {
      console.error('No stage set for export');
      return null;
    }

    const opts = { ...DEFAULT_OPTIONS, ...options };

    try {
      // Store original transform
      const originalPosition = { x: this.stage.x(), y: this.stage.y() };
      const originalScale = { x: this.stage.scaleX(), y: this.stage.scaleY() };

      // Reset transform for export
      this.stage.position({ x: 0, y: 0 });
      this.stage.scale({ x: 1, y: 1 });

      // Get the data URL
      const dataUrl = this.stage.toDataURL({
        pixelRatio: opts.pixelRatio,
        mimeType: 'image/png',
        quality: 1,
      });

      // Restore original transform
      this.stage.position(originalPosition);
      this.stage.scale(originalScale);

      // Convert to blob
      const response = await fetch(dataUrl);
      return await response.blob();
    } catch (error) {
      console.error('PNG export failed:', error);
      return null;
    }
  }

  /**
   * Download PNG file
   */
  async downloadPNG(filename: string = 'diagram.png', options: ExportOptions = {}): Promise<boolean> {
    const blob = await this.exportToPNG(options);
    if (!blob) return false;

    this.downloadBlob(blob, filename);
    return true;
  }

  /**
   * Export to SVG string
   */
  exportToSVG(options: ExportOptions = {}): string | null {
    if (!this.stage) {
      console.error('No stage set for export');
      return null;
    }

    const opts = { ...DEFAULT_OPTIONS, ...options };

    try {
      // Store original transform
      const originalPosition = { x: this.stage.x(), y: this.stage.y() };
      const originalScale = { x: this.stage.scaleX(), y: this.stage.scaleY() };

      // Reset transform for export
      this.stage.position({ x: 0, y: 0 });
      this.stage.scale({ x: 1, y: 1 });

      // Build SVG manually from stage content
      const layers = this.stage.getLayers();
      const width = this.stage.width();
      const height = this.stage.height();

      let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style type="text/css">
      .component-label { font-family: Arial, sans-serif; font-size: 10px; }
    </style>
  </defs>
  <rect width="100%" height="100%" fill="${opts.backgroundColor}"/>
`;

      // Export each layer
      for (const layer of layers) {
        svgContent += this.layerToSVG(layer);
      }

      // Add title block if requested
      if (opts.includeTitleBlock && this.diagram) {
        svgContent += this.createTitleBlockSVG(width, height);
      }

      svgContent += '</svg>';

      // Restore original transform
      this.stage.position(originalPosition);
      this.stage.scale(originalScale);

      return svgContent;
    } catch (error) {
      console.error('SVG export failed:', error);
      return null;
    }
  }

  /**
   * Download SVG file
   */
  downloadSVG(filename: string = 'diagram.svg', options: ExportOptions = {}): boolean {
    const svg = this.exportToSVG(options);
    if (!svg) return false;

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    this.downloadBlob(blob, filename);
    return true;
  }

  /**
   * Export to PDF
   */
  async exportToPDF(options: ExportOptions = {}): Promise<Blob | null> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Dynamic import of jsPDF
    const { jsPDF } = await import('jspdf');

    const paperSize = PAPER_SIZES[opts.paperSize || 'A3'];
    const isLandscape = opts.orientation === 'landscape';

    const pdfWidth = isLandscape ? paperSize.height : paperSize.width;
    const pdfHeight = isLandscape ? paperSize.width : paperSize.height;

    const pdf = new jsPDF({
      orientation: opts.orientation,
      unit: 'mm',
      format: [pdfWidth, pdfHeight],
    });

    try {
      // Get PNG data
      const pngBlob = await this.exportToPNG({ pixelRatio: 3, backgroundColor: opts.backgroundColor });
      if (!pngBlob) {
        throw new Error('Failed to generate PNG for PDF');
      }

      // Convert blob to data URL
      const pngDataUrl = await this.blobToDataURL(pngBlob);

      // Calculate dimensions with margins
      const margin = opts.margin || 10;
      const drawingWidth = pdfWidth - 2 * margin;
      const drawingHeight = pdfHeight - 2 * margin - (opts.includeTitleBlock ? 25 : 0);

      // Add the image
      pdf.addImage(pngDataUrl, 'PNG', margin, margin, drawingWidth, drawingHeight);

      // Add title block
      if (opts.includeTitleBlock && this.diagram) {
        this.addPDFTitleBlock(pdf, pdfWidth, pdfHeight, margin);
      }

      // Return as blob
      return pdf.output('blob');
    } catch (error) {
      console.error('PDF export failed:', error);
      return null;
    }
  }

  /**
   * Download PDF file
   */
  async downloadPDF(filename: string = 'diagram.pdf', options: ExportOptions = {}): Promise<boolean> {
    const blob = await this.exportToPDF(options);
    if (!blob) return false;

    this.downloadBlob(blob, filename);
    return true;
  }

  /**
   * Convert Konva layer to SVG elements
   */
  private layerToSVG(layer: Konva.Layer): string {
    let svg = `  <g id="${layer.id() || 'layer'}">\n`;

    layer.getChildren().forEach((node) => {
      svg += this.nodeToSVG(node);
    });

    svg += '  </g>\n';
    return svg;
  }

  /**
   * Convert Konva node to SVG element
   */
  private nodeToSVG(node: Konva.Node): string {
    if (!node.visible()) return '';

    // Handle groups
    if (node instanceof Konva.Group) {
      let svg = `    <g transform="translate(${node.x()}, ${node.y()}) rotate(${node.rotation()})">\n`;
      (node as Konva.Group).getChildren().forEach((child) => {
        svg += this.nodeToSVG(child);
      });
      svg += '    </g>\n';
      return svg;
    }

    // Handle shapes
    if (node instanceof Konva.Rect) {
      return `    <rect x="${node.x()}" y="${node.y()}" width="${node.width()}" height="${node.height()}"
              fill="${node.fill() || 'none'}" stroke="${node.stroke() || 'none'}"
              stroke-width="${node.strokeWidth() || 0}" rx="${node.cornerRadius() || 0}"/>\n`;
    }

    if (node instanceof Konva.Circle) {
      return `    <circle cx="${node.x()}" cy="${node.y()}" r="${node.radius()}"
              fill="${node.fill() || 'none'}" stroke="${node.stroke() || 'none'}"
              stroke-width="${node.strokeWidth() || 0}"/>\n`;
    }

    if (node instanceof Konva.Line) {
      const points = node.points();
      const pathData = this.pointsToPath(points);
      return `    <path d="${pathData}" fill="none" stroke="${node.stroke() || '#000'}"
              stroke-width="${node.strokeWidth() || 1}" stroke-linecap="round" stroke-linejoin="round"/>\n`;
    }

    if (node instanceof Konva.Path) {
      return `    <path d="${node.data()}" fill="${node.fill() || 'none'}"
              stroke="${node.stroke() || 'none'}" stroke-width="${node.strokeWidth() || 0}"/>\n`;
    }

    if (node instanceof Konva.Text) {
      return `    <text x="${node.x()}" y="${node.y()}" font-family="${node.fontFamily() || 'Arial'}"
              font-size="${node.fontSize() || 12}" fill="${node.fill() || '#000'}">${this.escapeXml(node.text())}</text>\n`;
    }

    return '';
  }

  /**
   * Convert points array to SVG path data
   */
  private pointsToPath(points: number[]): string {
    if (points.length < 4) return '';

    let path = `M ${points[0]} ${points[1]}`;
    for (let i = 2; i < points.length; i += 2) {
      path += ` L ${points[i]} ${points[i + 1]}`;
    }
    return path;
  }

  /**
   * Create SVG title block
   */
  private createTitleBlockSVG(width: number, height: number): string {
    if (!this.diagram) return '';

    const blockHeight = 50;
    const y = height - blockHeight - 10;
    const x = 10;
    const blockWidth = width - 20;

    const info = this.getDiagramInfo();

    return `
  <g id="title-block" transform="translate(${x}, ${y})">
    <rect width="${blockWidth}" height="${blockHeight}" fill="white" stroke="#000" stroke-width="1"/>
    <line x1="${blockWidth * 0.5}" y1="0" x2="${blockWidth * 0.5}" y2="${blockHeight}" stroke="#000"/>
    <line x1="${blockWidth * 0.75}" y1="0" x2="${blockWidth * 0.75}" y2="${blockHeight}" stroke="#000"/>
    <line x1="0" y1="${blockHeight / 2}" x2="${blockWidth * 0.5}" y2="${blockHeight / 2}" stroke="#000"/>
    <text x="5" y="15" font-family="Arial" font-size="12" font-weight="bold">${this.escapeXml(info.title)}</text>
    <text x="5" y="35" font-family="Arial" font-size="10">${this.escapeXml(info.subtitle || '')}</text>
    <text x="${blockWidth * 0.52}" y="15" font-family="Arial" font-size="9">Rev: ${this.escapeXml(info.revision)}</text>
    <text x="${blockWidth * 0.52}" y="28" font-family="Arial" font-size="9">Date: ${this.escapeXml(info.date)}</text>
    <text x="${blockWidth * 0.52}" y="41" font-family="Arial" font-size="9">Author: ${this.escapeXml(info.author)}</text>
    <text x="${blockWidth * 0.77}" y="15" font-family="Arial" font-size="9">Sheet: ${info.sheetNumber || '1'} of ${info.totalSheets || '1'}</text>
    <text x="${blockWidth * 0.77}" y="28" font-family="Arial" font-size="9">${this.escapeXml(info.facility || '')}</text>
    <text x="${blockWidth * 0.77}" y="41" font-family="Arial" font-size="9">${this.escapeXml(info.system || '')}</text>
  </g>
`;
  }

  /**
   * Add title block to PDF
   */
  private addPDFTitleBlock(pdf: InstanceType<typeof import('jspdf').jsPDF>, pdfWidth: number, pdfHeight: number, margin: number): void {
    if (!this.diagram) return;

    const info = this.getDiagramInfo();
    const blockHeight = 20;
    const y = pdfHeight - margin - blockHeight;
    const blockWidth = pdfWidth - 2 * margin;

    // Draw border
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.3);
    pdf.rect(margin, y, blockWidth, blockHeight);

    // Draw dividers
    pdf.line(margin + blockWidth * 0.5, y, margin + blockWidth * 0.5, y + blockHeight);
    pdf.line(margin + blockWidth * 0.75, y, margin + blockWidth * 0.75, y + blockHeight);
    pdf.line(margin, y + blockHeight / 2, margin + blockWidth * 0.5, y + blockHeight / 2);

    // Add text
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(info.title, margin + 2, y + 5);

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(info.subtitle || '', margin + 2, y + 12);

    pdf.text(`Rev: ${info.revision}`, margin + blockWidth * 0.52, y + 5);
    pdf.text(`Date: ${info.date}`, margin + blockWidth * 0.52, y + 10);
    pdf.text(`Author: ${info.author}`, margin + blockWidth * 0.52, y + 15);

    pdf.text(`Sheet: ${info.sheetNumber || '1'} of ${info.totalSheets || '1'}`, margin + blockWidth * 0.77, y + 5);
    pdf.text(info.facility || '', margin + blockWidth * 0.77, y + 10);
    pdf.text(info.system || '', margin + blockWidth * 0.77, y + 15);
  }

  /**
   * Get diagram info for title block
   */
  private getDiagramInfo(): TitleBlockInfo {
    if (!this.diagram) {
      return {
        title: 'Untitled Diagram',
        revision: 'A',
        date: new Date().toLocaleDateString(),
        author: 'Unknown',
      };
    }

    return {
      title: this.diagram.metadata.title || this.diagram.name,
      subtitle: this.diagram.metadata.description,
      revision: this.diagram.metadata.revision,
      date: new Date(this.diagram.modifiedAt).toLocaleDateString(),
      author: this.diagram.metadata.author,
      sheetNumber: this.diagram.metadata.sheetNumber,
      totalSheets: this.diagram.metadata.totalSheets,
      facility: this.diagram.metadata.facility,
      system: this.diagram.metadata.system,
    };
  }

  /**
   * Download a blob as a file
   */
  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  /**
   * Convert blob to data URL
   */
  private blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

// Singleton instance
export const exportManager = new ExportManager();
