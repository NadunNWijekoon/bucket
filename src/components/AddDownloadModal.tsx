import { useState, useEffect, useRef } from 'react';
import { useApp, getFileCategoryFromName, extractFilenameFromUrl, type FileCategory } from '../store/appStore';



const CATEGORIES: { id: FileCategory; label: string; icon: string }[] = [
  { id: 'video', label: 'Videos', icon: '🎬' },
  { id: 'music', label: 'Music', icon: '🎵' },
  { id: 'image', label: 'Images', icon: '🖼️' },
  { id: 'document', label: 'Documents', icon: '📄' },
  { id: 'archive', label: 'Archives', icon: '📦' },
  { id: 'other', label: 'Other', icon: '📁' },
];

export default function AddDownloadModal() {
  const {
    isAddModalOpen,
    addModalTab,
    setAddModalTab,
    closeAddModal,
    addDownload,
  } = useApp();

  // Tab 1: Single URL
  const [singleUrl, setSingleUrl] = useState('');
  const [singleFilename, setSingleFilename] = useState('');
  const [singleCategory, setSingleCategory] = useState<FileCategory>('other');
  
  // Tab 2: Batch Add
  const [batchText, setBatchText] = useState('');
  const [batchCategory, setBatchCategory] = useState<FileCategory | 'auto'>('auto');

  // Tab 3: Import File
  const [importedUrls, setImportedUrls] = useState<{ url: string; checked: boolean }[]>([]);
  const [importCategory, setImportCategory] = useState<FileCategory | 'auto'>('auto');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Auto-extract filename and category for Single URL
  useEffect(() => {
    if (singleUrl.trim()) {
      const url = singleUrl.trim();
      const extractedName = extractFilenameFromUrl(url);
      // Only overwrite if filename is empty or was previously auto-generated
      if (!singleFilename || singleFilename.startsWith('download-')) {
        setSingleFilename(extractedName || `download-${Date.now()}.bin`);
      }
      if (extractedName) {
        setSingleCategory(getFileCategoryFromName(extractedName));
      }
    }
  }, [singleUrl]);

  // Focus input when modal opens
  const singleUrlInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isAddModalOpen && addModalTab === 'single') {
      setTimeout(() => {
        singleUrlInputRef.current?.focus();
      }, 50);
    }
  }, [isAddModalOpen, addModalTab]);

  if (!isAddModalOpen) return null;

  // Single URL Submit
  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleUrl.trim()) return;
    const url = singleUrl.trim();
    const filename = singleFilename.trim() || extractFilenameFromUrl(url) || `download-${Date.now()}.bin`;
    const category = singleCategory;
    const size = 0; // unknown size; main process will update when available
    addDownload(filename, url, size, category);
    
    // Clear & Close
    setSingleUrl('');
    setSingleFilename('');
    closeAddModal();
  };

  // Batch Submit
  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchText.trim()) return;
    
    const urls = batchText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('http://') || line.startsWith('https://'));

    urls.forEach(url => {
      const filename = extractFilenameFromUrl(url) || `download-${Date.now()}.bin`;
      const category = batchCategory === 'auto' ? getFileCategoryFromName(filename) : batchCategory;
      addDownload(filename, url, 0, category);
    });

    setBatchText('');
    closeAddModal();
  };

  // Parse file contents for URLs
  const parseFileContents = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s"'<>]+)/g;
    const matches = text.match(urlRegex) || [];
    // Deduplicate
    const uniqueMatches = Array.from(new Set(matches)).map(url => {
      // Clean up potential trailing punctuation
      let cleanUrl = url;
      if (/[.,;:)]$/.test(cleanUrl)) {
        cleanUrl = cleanUrl.slice(0, -1);
      }
      return cleanUrl;
    });

    setImportedUrls(uniqueMatches.map(url => ({ url, checked: true })));
  };

  // Handle File Upload Select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        parseFileContents(text);
      };
      reader.readAsText(file);
    }
  };

  // File Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        parseFileContents(text);
      };
      reader.readAsText(file);
    }
  };

  // Import URLs Submit
  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedUrls = importedUrls.filter(item => item.checked).map(item => item.url);
    
    selectedUrls.forEach(url => {
      const filename = extractFilenameFromUrl(url) || `download-${Date.now()}.bin`;
      const category = importCategory === 'auto' ? getFileCategoryFromName(filename) : importCategory;
      addDownload(filename, url, 0, category);
    });

    // Reset
    setImportedUrls([]);
    setFileName('');
    closeAddModal();
  };

  // Select/Deselect All imported URLs
  const toggleSelectAll = () => {
    const allChecked = importedUrls.every(item => item.checked);
    setImportedUrls(prev => prev.map(item => ({ ...item, checked: !allChecked })));
  };

  const toggleImportedCheck = (index: number) => {
    setImportedUrls(prev => prev.map((item, idx) => idx === index ? { ...item, checked: !item.checked } : item));
  };

  return (
    <div className="modal-overlay" onClick={closeAddModal} id="add-download-modal">
      <div className="modal-container glass-card animate-in" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <h2>Add New Download</h2>
            <button className="modal-close-btn" onClick={closeAddModal} id="close-modal-btn">✖</button>
          </div>
          <div className="modal-tabs">
            <button 
              className={`modal-tab-btn ${addModalTab === 'single' ? 'active' : ''}`}
              onClick={() => setAddModalTab('single')}
              id="modal-tab-single"
            >
              🔗 Single URL
            </button>
            <button 
              className={`modal-tab-btn ${addModalTab === 'batch' ? 'active' : ''}`}
              onClick={() => setAddModalTab('batch')}
              id="modal-tab-batch"
            >
              📋 Batch URLs
            </button>
            <button 
              className={`modal-tab-btn ${addModalTab === 'import' ? 'active' : ''}`}
              onClick={() => setAddModalTab('import')}
              id="modal-tab-import"
            >
              📥 Import File
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Tab 1: Single URL */}
          {addModalTab === 'single' && (
            <form onSubmit={handleSingleSubmit} id="single-download-form">
              <div className="form-group">
                <label htmlFor="modal-url-input">Source URL</label>
                <input 
                  type="text" 
                  id="modal-url-input"
                  ref={singleUrlInputRef}
                  placeholder="https://example.com/file.zip"
                  value={singleUrl}
                  onChange={e => setSingleUrl(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="modal-filename-input">Save Filename</label>
                <input 
                  type="text" 
                  id="modal-filename-input"
                  placeholder="file.zip"
                  value={singleFilename}
                  onChange={e => setSingleFilename(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <div className="category-grid">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`category-select-btn ${singleCategory === cat.id ? 'active' : ''}`}
                      onClick={() => setSingleCategory(cat.id)}
                      id={`modal-cat-${cat.id}`}
                    >
                      <span className="cat-icon">{cat.icon}</span>
                      <span className="cat-label">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={closeAddModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" id="modal-submit-single">Start Download</button>
              </div>
            </form>
          )}

          {/* Tab 2: Batch Add */}
          {addModalTab === 'batch' && (
            <form onSubmit={handleBatchSubmit} id="batch-download-form">
              <div className="form-group">
                <label htmlFor="modal-batch-input">URLs List (One per line)</label>
                <textarea 
                  id="modal-batch-input"
                  rows={6}
                  placeholder="https://example.com/video.mp4&#10;https://example.com/song.mp3&#10;https://example.com/image.png"
                  value={batchText}
                  onChange={e => setBatchText(e.target.value)}
                  required
                />
                <span className="form-tip">Only lines starting with http:// or https:// will be processed.</span>
              </div>

              <div className="form-group">
                <label>Category Assignment</label>
                <div className="category-grid">
                  <button
                    type="button"
                    className={`category-select-btn ${batchCategory === 'auto' ? 'active' : ''}`}
                    onClick={() => setBatchCategory('auto')}
                  >
                    <span className="cat-icon">🤖</span>
                    <span className="cat-label">Auto Detect</span>
                  </button>
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`category-select-btn ${batchCategory === cat.id ? 'active' : ''}`}
                      onClick={() => setBatchCategory(cat.id)}
                    >
                      <span className="cat-icon">{cat.icon}</span>
                      <span className="cat-label">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={closeAddModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" id="modal-submit-batch">Add Batch ({
                  batchText.split('\n').map(l => l.trim()).filter(l => l.startsWith('http://') || l.startsWith('https://')).length
                })</button>
              </div>
            </form>
          )}

          {/* Tab 3: Import File */}
          {addModalTab === 'import' && (
            <form onSubmit={handleImportSubmit} id="import-download-form">
              {!fileName ? (
                <div 
                  className={`drag-drop-zone ${isDragging ? 'dragging' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  ref={dragRef}
                  id="modal-drag-drop-zone"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept=".txt,.csv,.html,.json"
                    style={{ display: 'none' }}
                  />
                  <div className="drag-icon">📁</div>
                  <h3>Drag & Drop File Here</h3>
                  <p>Or click to browse files (.txt, .csv, .html, .json)</p>
                </div>
              ) : (
                <div className="imported-preview-area">
                  <div className="imported-file-banner">
                    <span className="file-icon">📄</span>
                    <div className="file-info">
                      <span className="file-name">{fileName}</span>
                      <span className="file-meta">Found {importedUrls.length} URLs</span>
                    </div>
                    <button type="button" className="file-clear" onClick={() => { setFileName(''); setImportedUrls([]); }}>Change</button>
                  </div>

                  {importedUrls.length > 0 && (
                    <div className="url-checklist-container">
                      <div className="url-checklist-header">
                        <button type="button" className="checklist-toggle-all" onClick={toggleSelectAll}>
                          {importedUrls.every(item => item.checked) ? 'Deselect All' : 'Select All'}
                        </button>
                        <span>Selected {importedUrls.filter(item => item.checked).length} of {importedUrls.length}</span>
                      </div>
                      <div className="url-checklist-body">
                        {importedUrls.map((item, index) => (
                          <label key={index} className="url-checklist-item">
                            <input 
                              type="checkbox" 
                              checked={item.checked} 
                              onChange={() => toggleImportedCheck(index)}
                            />
                            <span className="url-text" title={item.url}>{item.url}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="form-group" style={{ marginTop: 16 }}>
                    <label>Category Assignment</label>
                    <div className="category-grid">
                      <button
                        type="button"
                        className={`category-select-btn ${importCategory === 'auto' ? 'active' : ''}`}
                        onClick={() => setImportCategory('auto')}
                      >
                        <span className="cat-icon">🤖</span>
                        <span className="cat-label">Auto Detect</span>
                      </button>
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          className={`category-select-btn ${importCategory === cat.id ? 'active' : ''}`}
                          onClick={() => setImportCategory(cat.id)}
                        >
                          <span className="cat-icon">{cat.icon}</span>
                          <span className="cat-label">{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="modal-actions" style={{ marginTop: 24 }}>
                    <button type="button" className="btn btn-outline" onClick={closeAddModal}>Cancel</button>
                    <button 
                      type="submit" 
                      className="btn btn-primary" 
                      disabled={importedUrls.filter(item => item.checked).length === 0}
                      id="modal-submit-import"
                    >
                      Import & Download ({importedUrls.filter(item => item.checked).length})
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
