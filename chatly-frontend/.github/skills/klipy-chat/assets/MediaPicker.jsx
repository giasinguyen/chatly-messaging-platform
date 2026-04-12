/**
 * MediaPicker — KLIPY GIF & Sticker Picker
 * -----------------------------------------
 * Drop-in React component for chat apps.
 *
 * Props:
 *   initialTab  'gif' | 'sticker'   Which tab opens first (default: 'gif')
 *   onSelect    (item) => void       Called when user picks an item
 *   onClose     () => void           Called when user closes the picker
 *
 * Usage:
 *   <MediaPicker initialTab="gif" onSelect={handleSelect} onClose={() => setOpen(false)} />
 *
 * Requires: klipy.js module and mediapicker.css (or equivalent styles)
 * Import path below assumes component is at src/components/MediaPicker.jsx
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchGifTrending,
  searchGifs,
  fetchStickerTrending,
  searchStickers,
  fetchGifCategories,
  fetchStickerCategories,
  triggerShare,
  getThumbUrl,
} from '../api/klipy';

export default function MediaPicker({ initialTab = 'gif', onSelect, onClose }) {
  const [activeTab, setActiveTab]         = useState(initialTab);
  const [query, setQuery]                 = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [items, setItems]                 = useState([]);
  const [categories, setCategories]       = useState([]);
  const [loading, setLoading]             = useState(false);
  const [page, setPage]                   = useState(1);
  const [hasNext, setHasNext]             = useState(false);
  const debounceRef = useRef(null);
  const gridRef     = useRef(null);
  const searchRef   = useRef(null);

  // ── Tab switch ──────────────────────────────────────────────────────────────
  const switchTab = (tab) => {
    setActiveTab(tab);
    setQuery('');
    setActiveCategory(null);
    setPage(1);
    setItems([]);
    if (searchRef.current) searchRef.current.value = '';
  };

  // ── Categories ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (activeTab === 'gif' ? fetchGifCategories() : fetchStickerCategories())
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [activeTab]);

  // ── Load items ──────────────────────────────────────────────────────────────
  const loadItems = useCallback(
    async (currentQuery, currentCategory, currentPage, currentTab, append = false) => {
      setLoading(true);
      try {
        const keyword = currentQuery || currentCategory || '';
        let result;
        if (currentTab === 'gif') {
          result = keyword
            ? await searchGifs(keyword, currentPage)
            : await fetchGifTrending(currentPage);
        } else {
          result = keyword
            ? await searchStickers(keyword, currentPage)
            : await fetchStickerTrending(currentPage);
        }
        setItems((prev) => (append ? [...prev, ...result.items] : result.items));
        setHasNext(result.hasNext);
      } catch {
        if (!append) setItems([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadItems(query, activeCategory, 1, activeTab);
    setPage(1);
  }, [activeTab, query, activeCategory, loadItems]);

  // ── Infinite scroll ─────────────────────────────────────────────────────────
  const handleGridScroll = useCallback(() => {
    if (!gridRef.current || loading || !hasNext) return;
    const { scrollTop, scrollHeight, clientHeight } = gridRef.current;
    if (scrollHeight - scrollTop - clientHeight < 150) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadItems(query, activeCategory, nextPage, activeTab, true);
    }
  }, [loading, hasNext, page, query, activeCategory, activeTab, loadItems]);

  // ── Search (debounced 400ms) ─────────────────────────────────────────────────
  const handleSearchChange = (e) => {
    setActiveCategory(null);
    clearTimeout(debounceRef.current);
    const val = e.target.value;
    debounceRef.current = setTimeout(() => setQuery(val), 400);
  };

  // ── Category chip click ──────────────────────────────────────────────────────
  const handleCategoryClick = (cat) => {
    setActiveCategory((prev) => (prev === cat ? null : cat));
    setQuery('');
    if (searchRef.current) searchRef.current.value = '';
  };

  // ── Item select + share tracking ─────────────────────────────────────────────
  const handleSelect = (item) => {
    triggerShare(activeTab, item.slug, query);
    onSelect(item);
  };

  return (
    <div className="media-picker" role="dialog" aria-label="GIF & Sticker picker">

      {/* ── Header tabs ── */}
      <div className="picker-header">
        <div className="picker-tabs">
          <button
            className={`picker-tab${activeTab === 'gif' ? ' active' : ''}`}
            onClick={() => switchTab('gif')}
          >
            GIF
          </button>
          <button
            className={`picker-tab${activeTab === 'sticker' ? ' active' : ''}`}
            onClick={() => switchTab('sticker')}
          >
            Sticker
          </button>
        </div>
        <button className="picker-close-btn" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z" />
          </svg>
        </button>
      </div>

      {/* ── Search ── */}
      <div className="picker-search-wrap">
        <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M10.442 10.442a1 1 0 0 1 1.415 0l3.85 3.85a1 1 0 0 1-1.414 1.414l-3.85-3.85a1 1 0 0 1 0-1.414z" />
          <path d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z" />
        </svg>
        {/* REQUIRED: placeholder must be "Search KLIPY" per KLIPY attribution guidelines */}
        <input
          ref={searchRef}
          type="text"
          className="picker-search-input"
          placeholder="Search KLIPY"
          onChange={handleSearchChange}
        />
      </div>

      {/* ── Category chips (hidden while searching) ── */}
      {categories.length > 0 && !query && (
        <div className="categories-scroll">
          {categories.slice(0, 14).map((cat) => (
            <button
              key={cat.query}
              className={`category-chip${activeCategory === cat.query ? ' active' : ''}`}
              onClick={() => handleCategoryClick(cat.query)}
            >
              {cat.preview_url && (
                <img src={cat.preview_url} alt="" className="category-chip-img" />
              )}
              <span>{cat.category}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Content grid ── */}
      <div
        ref={gridRef}
        className={`media-grid media-grid--${activeTab}`}
        onScroll={handleGridScroll}
      >
        {items.map((item) => (
          <button
            key={item.id}
            className={`media-item media-item--${activeTab}`}
            onClick={() => handleSelect(item)}
            title={item.title}
          >
            <img
              src={getThumbUrl(item)}
              alt={item.title}
              loading="lazy"
              className={activeTab === 'sticker' ? 'sticker-thumb' : 'gif-thumb'}
            />
          </button>
        ))}

        {loading && (
          <div className="picker-loading">
            <span className="spinner" />
            <span className="spinner" />
            <span className="spinner" />
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="picker-empty">
            <span>No results found</span>
          </div>
        )}
      </div>

      {/* ── Attribution (REQUIRED) ── */}
      <div className="klipy-attribution">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 12l3 3 5-5" />
        </svg>
        <span>Powered by KLIPY</span>
      </div>

    </div>
  );
}
