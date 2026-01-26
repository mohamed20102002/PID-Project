/**
 * Rich Description Editor Modal
 *
 * A modal dialog for editing rich text descriptions with:
 * - Text formatting (bold, italic, underline, colors)
 * - Headings
 * - Bullet/numbered lists
 * - Image embedding
 * - Hyperlinks to components/systems
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDiagramStore } from '../../store/diagramStore';

// Image element interface for tracking
interface ImageElement {
  id: string;
  element: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RichDescriptionEditorProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  componentKks: string;
  /** Callback when user clicks a component/system link */
  onNavigateToComponent?: (targetKks: string, targetSystemKks?: string) => void;
  /** When true, shows the description in read-only mode */
  readOnly?: boolean;
}

// Toolbar button component
const ToolbarButton: React.FC<{
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}> = ({ onClick, active, title, children }) => (
  <button
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded transition-colors ${
      active ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'
    }`}
  >
    {children}
  </button>
);

// Toolbar separator
const ToolbarSeparator: React.FC = () => (
  <div className="w-px h-6 bg-gray-300 mx-1" />
);

export const RichDescriptionEditor: React.FC<RichDescriptionEditorProps> = ({
  isOpen,
  onClose,
  value,
  onChange,
  componentKks,
  onNavigateToComponent,
  readOnly = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkType, setLinkType] = useState<'url' | 'component' | 'system'>('component');
  const [linkTarget, setLinkTarget] = useState('');
  const [linkText, setLinkText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Minimize/maximize state
  const [isMinimized, setIsMinimized] = useState(false);
  // Center horizontally, align with toolbar (approx 50px from top)
  const [minimizedPosition, setMinimizedPosition] = useState({ x: Math.max(20, (window.innerWidth - 200) / 2), y: 50 });
  const [isDraggingWindow, setIsDraggingWindow] = useState(false);
  const [dragWindowOffset, setDragWindowOffset] = useState({ x: 0, y: 0 });
  const [preservedContent, setPreservedContent] = useState<string>('');

  // Search state for component/system linking
  const [componentSearch, setComponentSearch] = useState('');
  const [systemSearch, setSystemSearch] = useState('');

  // Save selection range for link insertion
  const savedSelectionRef = useRef<Range | null>(null);

  // Get diagram for component/system references
  const diagram = useDiagramStore((state) => state.diagram);
  const diagramCache = useDiagramStore((state) => state.diagramCache);

  // Reset minimized state when component changes
  useEffect(() => {
    setIsMinimized(false);
    setPreservedContent('');
    // Reset position to center
    setMinimizedPosition({ x: Math.max(20, (window.innerWidth - 200) / 2), y: 50 });
  }, [componentKks]);

  // Initialize editor content
  useEffect(() => {
    if (isOpen && editorRef.current && !isMinimized) {
      // If we have preserved content from minimize, use that
      if (preservedContent) {
        editorRef.current.innerHTML = preservedContent;
        setPreservedContent('');
      } else {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [isOpen, value, isMinimized]);

  // Focus the modal when opened to capture keyboard events
  useEffect(() => {
    if (isOpen && !isMinimized && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  // Handle minimize - save content and center position
  const handleMinimize = useCallback(() => {
    if (editorRef.current) {
      setPreservedContent(editorRef.current.innerHTML);
    }
    // Center horizontally, align with toolbar height
    setMinimizedPosition({ x: Math.max(20, (window.innerWidth - 200) / 2), y: 50 });
    setIsMinimized(true);
  }, []);

  // Handle maximize - content will be restored via useEffect
  const handleMaximize = useCallback(() => {
    setIsMinimized(false);
  }, []);

  // Save current selection before opening link dialog
  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  }, []);

  // Restore selection and insert content
  const restoreSelectionAndInsert = useCallback((html: string) => {
    if (editorRef.current) {
      editorRef.current.focus();

      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();

        if (savedSelectionRef.current) {
          selection.addRange(savedSelectionRef.current);
        } else {
          // If no saved selection, insert at end
          const range = document.createRange();
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
          selection.addRange(range);
        }

        document.execCommand('insertHTML', false, html);
      }
    }
  }, []);

  // Execute formatting command
  const execCommand = useCallback((command: string, value?: string) => {
    // Ensure editor has focus before executing commands
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, value);
  }, []);

  // Format handlers
  const handleBold = () => execCommand('bold');
  const handleItalic = () => execCommand('italic');
  const handleUnderline = () => execCommand('underline');
  const handleStrikethrough = () => execCommand('strikeThrough');

  // Heading handlers
  const handleHeading = (level: string) => {
    execCommand('formatBlock', level);
  };

  // List handlers
  const handleBulletList = () => execCommand('insertUnorderedList');
  const handleNumberedList = () => execCommand('insertOrderedList');

  // Color handler
  const handleTextColor = (color: string) => {
    execCommand('foreColor', color);
    setShowColorPicker(false);
  };

  // Highlight handler
  const handleHighlight = (color: string) => {
    execCommand('hiliteColor', color);
    setShowColorPicker(false);
  };

  // Font size state and handler
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
  const fontSizes = [
    { label: 'Small', value: '2', px: '13px' },
    { label: 'Normal', value: '3', px: '16px' },
    { label: 'Large', value: '4', px: '18px' },
    { label: 'X-Large', value: '5', px: '24px' },
    { label: 'XX-Large', value: '6', px: '32px' },
  ];

  const handleFontSize = (size: string) => {
    execCommand('fontSize', size);
    setShowFontSizeMenu(false);
  };

  // Image state for resize dialog
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [imageWidth, setImageWidth] = useState(300);
  const [imageAlign, setImageAlign] = useState<'left' | 'center' | 'right'>('left');

  // Selected image state for editing existing images
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [selectedImageWidth, setSelectedImageWidth] = useState(300);
  const [showImageSettings, setShowImageSettings] = useState(false);
  const [imageSettingsPos, setImageSettingsPos] = useState({ x: 0, y: 0 });

  // Image resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const resizeHandleRef = useRef<HTMLDivElement>(null);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragImage, setDragImage] = useState<HTMLImageElement | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [alignmentGuides, setAlignmentGuides] = useState<{ type: 'horizontal' | 'vertical'; pos: number }[]>([]);
  const dragGhostRef = useRef<HTMLDivElement>(null);

  // Image handler - show dialog instead of inserting directly
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPendingImage(dataUrl);
      setImageWidth(300);
      setImageAlign('left');
      setShowImageDialog(true);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Insert image with settings
  const handleInsertImage = () => {
    if (!pendingImage || !editorRef.current) return;

    const imageId = `img-${Date.now()}`;
    const imgHtml = `<div class="rich-editor-image-wrapper" data-image-id="${imageId}" style="position: relative; display: inline-block; margin: 8px; cursor: move;">
      <img src="${pendingImage}" data-image-id="${imageId}" style="display: block; width: ${imageWidth}px; max-width: 100%; height: auto; border-radius: 4px; pointer-events: auto;" />
    </div><p><br></p>`;

    // Focus the editor first
    editorRef.current.focus();

    // Try to insert using execCommand
    const success = document.execCommand('insertHTML', false, imgHtml);

    // Fallback: if execCommand failed, append to the end
    if (!success) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = imgHtml;
      editorRef.current.appendChild(wrapper.firstChild!);
    }

    setShowImageDialog(false);
    setPendingImage(null);
  };

  // Handle clicking on images in the editor
  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    // In view-only mode, don't allow image selection
    if (readOnly) return;

    const target = e.target as HTMLElement;

    // Remove selected class from all images
    editorRef.current?.querySelectorAll('img.selected').forEach(img => {
      img.classList.remove('selected');
    });

    // Check if clicked on an image
    if (target.tagName === 'IMG') {
      const img = target as HTMLImageElement;
      img.classList.add('selected');
      setSelectedImage(img);
      setSelectedImageWidth(img.offsetWidth || 300);

      // Position the controls relative to the image (bottom-right corner)
      const editorRect = editorRef.current?.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();
      if (editorRect) {
        setImageSettingsPos({
          x: imgRect.left - editorRect.left + imgRect.width,
          y: imgRect.top - editorRect.top
        });
      }
      setShowImageSettings(true);
      e.preventDefault();
      e.stopPropagation();
    } else {
      // Clicked elsewhere, deselect image
      setSelectedImage(null);
      setShowImageSettings(false);
    }
  }, [readOnly]);

  // Update selected image width
  const handleUpdateImageWidth = useCallback((newWidth: number) => {
    if (selectedImage && editorRef.current) {
      selectedImage.style.width = `${newWidth}px`;
      setSelectedImageWidth(newWidth);
      // Notify parent of the change
      onChange(editorRef.current.innerHTML);
    }
  }, [selectedImage, onChange]);

  // Delete selected image
  const handleDeleteImage = useCallback(() => {
    if (selectedImage && editorRef.current) {
      selectedImage.classList.remove('selected');
      const wrapper = selectedImage.closest('.rich-editor-image-wrapper');
      if (wrapper) {
        wrapper.remove();
      } else {
        selectedImage.remove();
      }
      setSelectedImage(null);
      setShowImageSettings(false);

      // Notify parent that content has changed (so the deleted image is removed on save)
      onChange(editorRef.current.innerHTML);
    }
  }, [selectedImage, onChange]);

  // Start resizing image
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (!selectedImage) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStartX(e.clientX);
    setResizeStartWidth(selectedImage.offsetWidth);
  }, [selectedImage]);

  // Handle resize mouse move
  useEffect(() => {
    if (!isResizing || !selectedImage) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStartX;
      const newWidth = Math.max(50, Math.min(800, resizeStartWidth + deltaX));
      selectedImage.style.width = `${newWidth}px`;
      setSelectedImageWidth(newWidth);

      // Update resize handle position
      const editorRect = editorRef.current?.getBoundingClientRect();
      const imgRect = selectedImage.getBoundingClientRect();
      if (editorRect) {
        setImageSettingsPos({
          x: imgRect.left - editorRect.left + imgRect.width,
          y: imgRect.top - editorRect.top
        });
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // Notify parent of the change
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, selectedImage, resizeStartX, resizeStartWidth, onChange]);

  // Close image settings when clicking outside
  useEffect(() => {
    if (!showImageSettings) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.image-settings-panel') && target.tagName !== 'IMG') {
        editorRef.current?.querySelectorAll('img.selected').forEach(img => {
          img.classList.remove('selected');
        });
        setSelectedImage(null);
        setShowImageSettings(false);
      }
    };

    // Delay adding listener to avoid immediate trigger
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showImageSettings]);

  // Close font size menu when clicking outside
  useEffect(() => {
    if (!showFontSizeMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.font-size-menu')) {
        setShowFontSizeMenu(false);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFontSizeMenu]);

  // Get all draggable elements for alignment
  const getDraggableElements = useCallback((): ImageElement[] => {
    if (!editorRef.current) return [];
    const images = editorRef.current.querySelectorAll('img');
    const elements: ImageElement[] = [];
    const editorRect = editorRef.current.getBoundingClientRect();

    images.forEach((img, index) => {
      const rect = img.getBoundingClientRect();
      elements.push({
        id: img.getAttribute('data-image-id') || `img-${index}`,
        element: img as HTMLImageElement,
        x: rect.left - editorRect.left,
        y: rect.top - editorRect.top,
        width: rect.width,
        height: rect.height
      });
    });
    return elements;
  }, []);

  // Find alignment guides when dragging
  const findAlignmentGuides = useCallback((currentX: number, currentY: number, currentWidth: number, currentHeight: number, excludeId?: string) => {
    const elements = getDraggableElements().filter(el => el.id !== excludeId);
    const guides: { type: 'horizontal' | 'vertical'; pos: number }[] = [];
    const threshold = 8; // Snap threshold in pixels

    elements.forEach(el => {
      // Vertical alignment (left edges)
      if (Math.abs(currentX - el.x) < threshold) {
        guides.push({ type: 'vertical', pos: el.x });
      }
      // Vertical alignment (right edges)
      if (Math.abs((currentX + currentWidth) - (el.x + el.width)) < threshold) {
        guides.push({ type: 'vertical', pos: el.x + el.width });
      }
      // Vertical alignment (centers)
      if (Math.abs((currentX + currentWidth / 2) - (el.x + el.width / 2)) < threshold) {
        guides.push({ type: 'vertical', pos: el.x + el.width / 2 });
      }
      // Horizontal alignment (top edges)
      if (Math.abs(currentY - el.y) < threshold) {
        guides.push({ type: 'horizontal', pos: el.y });
      }
      // Horizontal alignment (bottom edges)
      if (Math.abs((currentY + currentHeight) - (el.y + el.height)) < threshold) {
        guides.push({ type: 'horizontal', pos: el.y + el.height });
      }
      // Horizontal alignment (centers)
      if (Math.abs((currentY + currentHeight / 2) - (el.y + el.height / 2)) < threshold) {
        guides.push({ type: 'horizontal', pos: el.y + el.height / 2 });
      }
    });

    return guides;
  }, [getDraggableElements]);

  // Start dragging an image
  const handleImageMouseDown = useCallback((e: React.MouseEvent) => {
    // In view-only mode, don't allow image dragging
    if (readOnly) return;

    const target = e.target as HTMLElement;
    if (target.tagName !== 'IMG') return;

    const img = target as HTMLImageElement;
    const editorRect = editorRef.current?.getBoundingClientRect();
    if (!editorRect) return;

    const imgRect = img.getBoundingClientRect();

    setDragImage(img);
    setDragOffset({
      x: e.clientX - imgRect.left,
      y: e.clientY - imgRect.top
    });
    setDragPos({
      x: imgRect.left - editorRect.left,
      y: imgRect.top - editorRect.top
    });
    setIsDragging(true);

    // Hide original image while dragging
    img.style.opacity = '0.3';

    e.preventDefault();
  }, [readOnly]);

  // Handle mouse move during drag
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragImage || !editorRef.current) return;

    const editorRect = editorRef.current.getBoundingClientRect();
    const newX = e.clientX - editorRect.left - dragOffset.x;
    const newY = e.clientY - editorRect.top - dragOffset.y;

    // Find alignment guides
    const imageId = dragImage.getAttribute('data-image-id') || '';
    const guides = findAlignmentGuides(newX, newY, dragImage.width, dragImage.height, imageId);
    setAlignmentGuides(guides);

    // Apply snapping
    let snappedX = newX;
    let snappedY = newY;

    guides.forEach(guide => {
      if (guide.type === 'vertical') {
        // Check which edge to snap
        if (Math.abs(newX - guide.pos) < 8) snappedX = guide.pos;
        else if (Math.abs(newX + dragImage.width - guide.pos) < 8) snappedX = guide.pos - dragImage.width;
        else if (Math.abs(newX + dragImage.width / 2 - guide.pos) < 8) snappedX = guide.pos - dragImage.width / 2;
      }
      if (guide.type === 'horizontal') {
        if (Math.abs(newY - guide.pos) < 8) snappedY = guide.pos;
        else if (Math.abs(newY + dragImage.height - guide.pos) < 8) snappedY = guide.pos - dragImage.height;
        else if (Math.abs(newY + dragImage.height / 2 - guide.pos) < 8) snappedY = guide.pos - dragImage.height / 2;
      }
    });

    setDragPos({ x: snappedX, y: snappedY });
  }, [isDragging, dragImage, dragOffset, findAlignmentGuides]);

  // Handle mouse up to finish drag
  const handleMouseUp = useCallback(() => {
    if (!isDragging || !dragImage || !editorRef.current) return;

    // Find the wrapper or create positioning
    const wrapper = dragImage.closest('.rich-editor-image-wrapper') as HTMLElement;
    if (wrapper) {
      wrapper.style.position = 'absolute';
      wrapper.style.left = `${dragPos.x}px`;
      wrapper.style.top = `${dragPos.y}px`;
      wrapper.style.margin = '0';
    }

    // Restore image opacity
    dragImage.style.opacity = '1';

    setIsDragging(false);
    setDragImage(null);
    setAlignmentGuides([]);
  }, [isDragging, dragImage, dragPos]);

  // Open link dialog - save selection first
  const openLinkDialog = useCallback(() => {
    saveSelection();
    setShowLinkDialog(true);
  }, [saveSelection]);

  // Link handler
  const handleInsertLink = useCallback(() => {
    if (!linkTarget) return;

    let href = linkTarget;
    let displayText = linkText || linkTarget;

    if (linkType === 'component') {
      href = `kks://${linkTarget}`;
      displayText = linkText || linkTarget;
    } else if (linkType === 'system') {
      href = `system://${linkTarget}`;
      displayText = linkText || linkTarget;
    }

    // Insert link HTML using restored selection
    const linkHtml = `<a href="${href}" class="text-blue-600 underline hover:text-blue-800" data-link-type="${linkType}">${displayText}</a>`;
    restoreSelectionAndInsert(linkHtml);

    setShowLinkDialog(false);
    setLinkTarget('');
    setLinkText('');
    setComponentSearch('');
    setSystemSearch('');
  }, [linkTarget, linkText, linkType, restoreSelectionAndInsert]);

  // Get available components for linking (from ALL systems)
  const availableComponents = React.useMemo(() => {
    const components: Array<{ kks: string; systemKks: string; type: string }> = [];

    // Add components from current diagram
    if (diagram) {
      Object.entries(diagram.components).forEach(([kks, comp]) => {
        if (kks !== componentKks) {
          components.push({
            kks,
            systemKks: diagram.systemKks,
            type: comp.type,
          });
        }
      });
    }

    // Add components from cached diagrams (other systems)
    Object.entries(diagramCache).forEach(([systemKks, cachedDiagram]) => {
      if (cachedDiagram && systemKks !== diagram?.systemKks) {
        Object.entries(cachedDiagram.components).forEach(([kks, comp]) => {
          components.push({
            kks,
            systemKks,
            type: comp.type,
          });
        });
      }
    });

    return components;
  }, [diagram, diagramCache, componentKks]);

  // Filtered components based on search
  const filteredComponents = React.useMemo(() => {
    if (!componentSearch.trim()) return availableComponents.slice(0, 50); // Limit initial display
    const search = componentSearch.toLowerCase();
    return availableComponents.filter(
      comp => comp.kks.toLowerCase().includes(search) || comp.systemKks.toLowerCase().includes(search)
    ).slice(0, 50);
  }, [availableComponents, componentSearch]);

  // Get available systems for linking
  const availableSystems = React.useMemo(() => {
    const systems = new Set<string>();
    if (diagram) systems.add(diagram.systemKks);
    Object.keys(diagramCache).forEach(kks => systems.add(kks));
    return Array.from(systems);
  }, [diagram, diagramCache]);

  // Filtered systems based on search
  const filteredSystems = React.useMemo(() => {
    if (!systemSearch.trim()) return availableSystems;
    const search = systemSearch.toLowerCase();
    return availableSystems.filter(kks => kks.toLowerCase().includes(search));
  }, [availableSystems, systemSearch]);

  // Handle link click in editor (for navigation)
  const handleLinkClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const anchor = target.tagName === 'A' ? target : target.closest('a');

    if (anchor) {
      e.preventDefault();
      e.stopPropagation();

      const href = anchor.getAttribute('href');
      const linkTypeAttr = anchor.getAttribute('data-link-type');

      if (href) {
        // Determine link type from href if data attribute is missing
        const isComponentLink = href.startsWith('kks://');
        const isSystemLink = href.startsWith('system://');
        const isUrlLink = href.startsWith('http://') || href.startsWith('https://');

        if ((linkTypeAttr === 'component' || isComponentLink) && href.startsWith('kks://')) {
          const targetKks = href.replace('kks://', '');
          // Find which system this component belongs to
          const comp = availableComponents.find(c => c.kks === targetKks);

          // Save content and minimize the window so user can see the navigation
          if (editorRef.current) {
            const content = editorRef.current.innerHTML;
            onChange(content);
            setPreservedContent(content);
          }
          setIsMinimized(true);

          // Navigate after a short delay to allow minimize to complete
          if (onNavigateToComponent) {
            setTimeout(() => {
              onNavigateToComponent(targetKks, comp?.systemKks);
            }, 150);
          }
        } else if ((linkTypeAttr === 'system' || isSystemLink) && href.startsWith('system://')) {
          const targetSystemKks = href.replace('system://', '');

          // Save content and minimize the window so user can see the navigation
          if (editorRef.current) {
            const content = editorRef.current.innerHTML;
            onChange(content);
            setPreservedContent(content);
          }
          setIsMinimized(true);

          // Navigate after a short delay
          if (onNavigateToComponent) {
            setTimeout(() => {
              onNavigateToComponent('', targetSystemKks);
            }, 150);
          }
        } else if ((linkTypeAttr === 'url' || isUrlLink)) {
          window.open(href, '_blank');
        }
      }
    }
  }, [onNavigateToComponent, availableComponents, onChange]);

  // Handle save
  const handleSave = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    onClose();
  };

  // Handle cancel
  const handleCancel = () => {
    onClose();
  };

  // Handle minimize window dragging
  const handleMinimizedMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDraggingWindow(true);
    setDragWindowOffset({
      x: e.clientX - minimizedPosition.x,
      y: e.clientY - minimizedPosition.y,
    });
  }, [minimizedPosition]);

  const handleMinimizedMouseMove = useCallback((e: MouseEvent) => {
    if (isDraggingWindow) {
      setMinimizedPosition({
        x: e.clientX - dragWindowOffset.x,
        y: e.clientY - dragWindowOffset.y,
      });
    }
  }, [isDraggingWindow, dragWindowOffset]);

  const handleMinimizedMouseUp = useCallback(() => {
    setIsDraggingWindow(false);
  }, []);

  // Add/remove window drag listeners
  useEffect(() => {
    if (isDraggingWindow) {
      window.addEventListener('mousemove', handleMinimizedMouseMove);
      window.addEventListener('mouseup', handleMinimizedMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMinimizedMouseMove);
        window.removeEventListener('mouseup', handleMinimizedMouseUp);
      };
    }
  }, [isDraggingWindow, handleMinimizedMouseMove, handleMinimizedMouseUp]);

  // Stop keyboard events from bubbling up to prevent component deletion
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation();
    // In view-only mode, also prevent default for delete/backspace
    if (readOnly && (e.key === 'Backspace' || e.key === 'Delete')) {
      e.preventDefault();
    }
  }, [readOnly]);

  if (!isOpen) return null;

  const colors = [
    '#000000', '#374151', '#dc2626', '#ea580c', '#d97706',
    '#16a34a', '#0891b2', '#2563eb', '#7c3aed', '#db2777',
  ];

  const highlightColors = [
    '#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fecaca',
    '#fed7aa', '#d9f99d', '#a5f3fc', '#ddd6fe', '#f5d0fe',
  ];

  // Minimized state - render a small floating window
  if (isMinimized) {
    return (
      <div
        className="fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-300 cursor-move select-none outline-none"
        data-description-editor="true"
        tabIndex={-1}
        style={{
          left: minimizedPosition.x,
          top: minimizedPosition.y,
          minWidth: '200px',
        }}
        onMouseDown={handleMinimizedMouseDown}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center justify-between px-3 py-2 bg-blue-600 rounded-t-lg">
          <div className="flex items-center gap-2 text-white">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span className="text-sm font-medium">Description Editor</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleMaximize();
              }}
              className="p-1 hover:bg-blue-500 rounded transition-colors"
              title="Maximize"
            >
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCancel();
              }}
              className="p-1 hover:bg-red-500 rounded transition-colors"
              title="Close"
            >
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="px-3 py-2 text-xs text-gray-600">
          <span className="font-mono">{componentKks}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 outline-none"
      data-description-editor="true"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onClick={(e) => {
        // Only focus modal if clicking on the backdrop itself (not the content)
        if (e.target === modalRef.current) {
          modalRef.current.focus();
        }
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-[700px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">{readOnly ? 'View Description' : 'Edit Description'}</h2>
            <p className="text-xs text-gray-500 font-mono">{componentKks}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleMinimize}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="Minimize - allows you to navigate the canvas"
            >
              <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 14H4" />
              </svg>
            </button>
            <button
              onClick={handleCancel}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="Close"
            >
              <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Toolbar - hidden in read-only mode */}
        {!readOnly && (
        <div className="flex flex-wrap items-center gap-1 px-4 py-2 border-b border-gray-200 bg-gray-50">
          {/* Text formatting */}
          <ToolbarButton onClick={handleBold} title="Bold (Ctrl+B)">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/>
            </svg>
          </ToolbarButton>
          <ToolbarButton onClick={handleItalic} title="Italic (Ctrl+I)">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/>
            </svg>
          </ToolbarButton>
          <ToolbarButton onClick={handleUnderline} title="Underline (Ctrl+U)">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/>
            </svg>
          </ToolbarButton>
          <ToolbarButton onClick={handleStrikethrough} title="Strikethrough">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z"/>
            </svg>
          </ToolbarButton>

          <ToolbarSeparator />

          {/* Headings */}
          <select
            onChange={(e) => handleHeading(e.target.value)}
            className="px-2 py-1 text-sm border border-gray-300 rounded bg-white"
            defaultValue=""
          >
            <option value="" disabled>Heading</option>
            <option value="p">Normal</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
          </select>

          {/* Font Size */}
          <div className="relative font-size-menu">
            <button
              onClick={() => setShowFontSizeMenu(!showFontSizeMenu)}
              className="px-2 py-1 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50 flex items-center gap-1"
              title="Font Size"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 4v3h5v12h3V7h5V4H9zm-6 8h3v7h3v-7h3V9H3v3z"/>
              </svg>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </button>
            {showFontSizeMenu && (
              <div className="absolute top-full left-0 mt-1 py-1 bg-white rounded-lg shadow-xl border border-gray-200 z-10 min-w-[120px]">
                {fontSizes.map((size) => (
                  <button
                    key={size.value}
                    onClick={() => handleFontSize(size.value)}
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 flex items-center justify-between"
                  >
                    <span>{size.label}</span>
                    <span className="text-xs text-gray-400">{size.px}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <ToolbarSeparator />

          {/* Lists */}
          <ToolbarButton onClick={handleBulletList} title="Bullet List">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/>
            </svg>
          </ToolbarButton>
          <ToolbarButton onClick={handleNumberedList} title="Numbered List">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/>
            </svg>
          </ToolbarButton>

          <ToolbarSeparator />

          {/* Colors */}
          <div className="relative">
            <ToolbarButton onClick={() => setShowColorPicker(!showColorPicker)} title="Text Color">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11 2L5.5 16h2.25l1.12-3h6.25l1.12 3h2.25L13 2h-2zm-1.38 9L12 4.67 14.38 11H9.62z"/>
                <path d="M5 20h14v3H5z" fill="#2563eb"/>
              </svg>
            </ToolbarButton>
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 p-2 bg-white rounded-lg shadow-xl border border-gray-200 z-10">
                <p className="text-xs text-gray-500 mb-2">Text Color</p>
                <div className="grid grid-cols-5 gap-1 mb-3">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleTextColor(color)}
                      className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 mb-2">Highlight</p>
                <div className="grid grid-cols-5 gap-1">
                  {highlightColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleHighlight(color)}
                      className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <ToolbarSeparator />

          {/* Image */}
          <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Insert Image">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
            </svg>
          </ToolbarButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />

          {/* Link */}
          <ToolbarButton onClick={openLinkDialog} title="Insert Link">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
            </svg>
          </ToolbarButton>
        </div>
        )}

        {/* Editor */}
        <div className="flex-1 overflow-y-auto p-4 relative">
          <style>{`
            .rich-editor ul {
              list-style-type: disc !important;
              padding-left: 24px !important;
              margin: 8px 0 !important;
            }
            .rich-editor ol {
              list-style-type: decimal !important;
              padding-left: 24px !important;
              margin: 8px 0 !important;
            }
            .rich-editor li {
              display: list-item !important;
              margin: 4px 0 !important;
            }
            .rich-editor h1 {
              font-size: 1.5em !important;
              font-weight: bold !important;
              margin: 16px 0 8px 0 !important;
            }
            .rich-editor h2 {
              font-size: 1.25em !important;
              font-weight: bold !important;
              margin: 14px 0 6px 0 !important;
            }
            .rich-editor h3 {
              font-size: 1.1em !important;
              font-weight: bold !important;
              margin: 12px 0 4px 0 !important;
            }
            .rich-editor p {
              margin: 8px 0 !important;
            }
            .rich-editor img {
              max-width: 100% !important;
              height: auto !important;
              border-radius: 4px !important;
              cursor: pointer !important;
              transition: outline 0.15s ease !important;
            }
            .rich-editor img:hover {
              outline: 2px solid #93c5fd !important;
              outline-offset: 2px !important;
            }
            .rich-editor img.selected {
              outline: 3px solid #2563eb !important;
              outline-offset: 2px !important;
              box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.1) !important;
            }
            .rich-editor-image-wrapper {
              display: inline-block;
              position: relative;
            }
            .rich-editor a {
              color: #2563eb !important;
              text-decoration: underline !important;
              cursor: pointer !important;
            }
            .rich-editor a:hover {
              color: #1d4ed8 !important;
              background-color: #eff6ff !important;
              padding: 0 2px !important;
              border-radius: 2px !important;
            }
          `}</style>
          <div
            ref={editorRef}
            contentEditable={!readOnly}
            className={`rich-editor min-h-[300px] p-4 border border-gray-300 rounded-lg ${readOnly ? 'bg-gray-50' : 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'}`}
            style={{
              lineHeight: '1.6',
              position: 'relative',
              minHeight: '400px',
            }}
            onClick={(e) => {
              handleEditorClick(e);
              handleLinkClick(e);
            }}
            onDoubleClick={(e) => {
              // Prevent double-click from triggering default behavior on links
              const target = e.target as HTMLElement;
              if (target.tagName === 'A' || target.closest('a')) {
                e.preventDefault();
                e.stopPropagation();
                handleLinkClick(e);
              }
            }}
            onMouseDown={handleImageMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onKeyDown={(e) => e.stopPropagation()}
            onKeyUp={(e) => e.stopPropagation()}
          />

          {/* Alignment Guides */}
          {alignmentGuides.map((guide, index) => (
            <div
              key={index}
              style={{
                position: 'absolute',
                backgroundColor: '#3b82f6',
                zIndex: 100,
                pointerEvents: 'none',
                ...(guide.type === 'vertical'
                  ? {
                      left: guide.pos + 16, // Adjust for padding
                      top: 0,
                      width: '1px',
                      height: '100%',
                    }
                  : {
                      left: 0,
                      top: guide.pos + 16, // Adjust for padding
                      width: '100%',
                      height: '1px',
                    }),
              }}
            />
          ))}

          {/* Drag Ghost */}
          {isDragging && dragImage && (
            <div
              ref={dragGhostRef}
              style={{
                position: 'absolute',
                left: dragPos.x + 16, // Adjust for padding
                top: dragPos.y + 16,
                width: dragImage.width,
                height: dragImage.height,
                border: '2px dashed #3b82f6',
                borderRadius: '4px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                pointerEvents: 'none',
                zIndex: 50,
              }}
            />
          )}

          {/* Image Resize Handle and Delete Button - hidden in view-only mode */}
          {!readOnly && showImageSettings && selectedImage && (
            <>
              {/* Resize handle at bottom-right corner of selected image */}
              <div
                ref={resizeHandleRef}
                onMouseDown={handleResizeStart}
                style={{
                  position: 'absolute',
                  left: imageSettingsPos.x - 6,
                  top: imageSettingsPos.y + (selectedImage?.offsetHeight || 0) - 6,
                  width: 14,
                  height: 14,
                  background: '#3b82f6',
                  border: '2px solid white',
                  borderRadius: 2,
                  cursor: 'se-resize',
                  zIndex: 101,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }}
                title="Drag to resize"
              />

              {/* Delete button floating near the image */}
              <div
                style={{
                  position: 'absolute',
                  left: imageSettingsPos.x + 10,
                  top: imageSettingsPos.y - 10,
                  zIndex: 100,
                }}
                className="image-settings-panel"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={handleDeleteImage}
                  className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors"
                  title="Delete image"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Size indicator */}
              {isResizing && (
                <div
                  style={{
                    position: 'absolute',
                    left: imageSettingsPos.x - 30,
                    top: imageSettingsPos.y + (selectedImage?.offsetHeight || 0) + 10,
                    zIndex: 102,
                  }}
                  className="px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg"
                >
                  {selectedImageWidth}px
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {readOnly ? 'Close' : 'Cancel'}
          </button>
          {!readOnly && (
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
            >
              Save Description
            </button>
          )}
        </div>

        {/* Image Dialog */}
        {showImageDialog && pendingImage && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl p-4 w-[450px]">
              <h3 className="text-sm font-medium text-gray-800 mb-3">Insert Image</h3>

              {/* Preview */}
              <div className="mb-4 p-2 bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={pendingImage}
                  alt="Preview"
                  style={{ width: imageWidth, maxWidth: '100%', height: 'auto' }}
                  className="rounded"
                />
              </div>

              {/* Width */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Width: {imageWidth}px
                </label>
                <input
                  type="range"
                  min="100"
                  max="600"
                  value={imageWidth}
                  onChange={(e) => setImageWidth(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>100px</span>
                  <span>600px</span>
                </div>
              </div>

              {/* Alignment */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Alignment
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setImageAlign('left')}
                    className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors flex items-center justify-center gap-1 ${
                      imageAlign === 'left'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 3h18v2H3V3zm0 8h12v2H3v-2zm0 8h18v2H3v-2zm0-4h12v2H3v-2z"/>
                    </svg>
                    Left
                  </button>
                  <button
                    onClick={() => setImageAlign('center')}
                    className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors flex items-center justify-center gap-1 ${
                      imageAlign === 'center'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 3h18v2H3V3zm3 8h12v2H6v-2zm-3 8h18v2H3v-2zm3-4h12v2H6v-2z"/>
                    </svg>
                    Center
                  </button>
                  <button
                    onClick={() => setImageAlign('right')}
                    className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors flex items-center justify-center gap-1 ${
                      imageAlign === 'right'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 3h18v2H3V3zm6 8h12v2H9v-2zm-6 8h18v2H3v-2zm6-4h12v2H9v-2z"/>
                    </svg>
                    Right
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowImageDialog(false);
                    setPendingImage(null);
                  }}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInsertImage}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors"
                >
                  Insert Image
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Link Dialog */}
        {showLinkDialog && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl p-4 w-[500px] max-h-[80vh] flex flex-col">
              <h3 className="text-sm font-medium text-gray-800 mb-3">Insert Link</h3>

              {/* Link type selector */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => {
                    setLinkType('component');
                    setLinkTarget('');
                    setComponentSearch('');
                  }}
                  className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
                    linkType === 'component'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Component
                </button>
                <button
                  onClick={() => {
                    setLinkType('system');
                    setLinkTarget('');
                    setSystemSearch('');
                  }}
                  className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
                    linkType === 'system'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  System
                </button>
                <button
                  onClick={() => {
                    setLinkType('url');
                    setLinkTarget('');
                  }}
                  className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
                    linkType === 'url'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  URL
                </button>
              </div>

              {/* Target input */}
              <div className="mb-3 flex-1 min-h-0 flex flex-col">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {linkType === 'component' ? 'Search Component KKS' : linkType === 'system' ? 'Search System KKS' : 'URL'}
                </label>
                {linkType === 'component' ? (
                  <div className="flex flex-col flex-1 min-h-0">
                    {/* Search Input */}
                    <div className="relative mb-2">
                      <input
                        type="text"
                        value={componentSearch}
                        onChange={(e) => setComponentSearch(e.target.value)}
                        placeholder="Type to search components..."
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pl-9"
                      />
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                      </svg>
                    </div>
                    {/* Selected Component */}
                    {linkTarget && (
                      <div className="mb-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-blue-700">{linkTarget}</span>
                          {availableComponents.find(c => c.kks === linkTarget) && (
                            <span className="text-xs text-blue-500 ml-2">
                              (System: {availableComponents.find(c => c.kks === linkTarget)?.systemKks})
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => setLinkTarget('')}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                    {/* Component List */}
                    <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg max-h-[200px]">
                      {filteredComponents.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          {componentSearch ? 'No components found' : 'Start typing to search components'}
                        </div>
                      ) : (
                        filteredComponents.map((comp) => (
                          <button
                            key={`${comp.systemKks}-${comp.kks}`}
                            onClick={() => setLinkTarget(comp.kks)}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center justify-between ${
                              linkTarget === comp.kks ? 'bg-blue-50' : ''
                            }`}
                          >
                            <span className={`font-mono ${linkTarget === comp.kks ? 'text-blue-700 font-medium' : 'text-gray-800'}`}>
                              {comp.kks}
                            </span>
                            <span className="text-xs text-gray-400">{comp.systemKks}</span>
                          </button>
                        ))
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {availableComponents.length} total components across all systems
                    </div>
                  </div>
                ) : linkType === 'system' ? (
                  <div className="flex flex-col flex-1 min-h-0">
                    {/* Search Input */}
                    <div className="relative mb-2">
                      <input
                        type="text"
                        value={systemSearch}
                        onChange={(e) => setSystemSearch(e.target.value)}
                        placeholder="Type to search systems..."
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pl-9"
                      />
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                      </svg>
                    </div>
                    {/* Selected System */}
                    {linkTarget && (
                      <div className="mb-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                        <span className="text-sm font-medium text-green-700">{linkTarget}</span>
                        <button
                          onClick={() => setLinkTarget('')}
                          className="text-green-500 hover:text-green-700"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                    {/* System List */}
                    <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg max-h-[200px]">
                      {filteredSystems.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No systems found
                        </div>
                      ) : (
                        filteredSystems.map((kks) => (
                          <button
                            key={kks}
                            onClick={() => setLinkTarget(kks)}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                              linkTarget === kks ? 'bg-green-50' : ''
                            }`}
                          >
                            <span className={`font-mono ${linkTarget === kks ? 'text-green-700 font-medium' : 'text-gray-800'}`}>
                              {kks}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <input
                    type="url"
                    value={linkTarget}
                    onChange={(e) => setLinkTarget(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              {/* Display text */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Display Text (optional)
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Link text..."
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowLinkDialog(false);
                    setLinkTarget('');
                    setLinkText('');
                  }}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInsertLink}
                  disabled={!linkTarget}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Insert Link
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RichDescriptionEditor;
