import { useState, useCallback, useEffect } from 'react';
import { BOOKS } from '../data/books';

const STORAGE_KEY = 'bonetider-books-v1';

function loadPersisted() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}

function mergeBooksWithState(persisted) {
  return BOOKS.map(book => ({
    ...book,
    isFavorite:      persisted[book.id]?.isFavorite      ?? false,
    lastReadPage:    persisted[book.id]?.lastReadPage    ?? 1,
    bookmarks:       persisted[book.id]?.bookmarks       ?? [],
    progressPercent: persisted[book.id]?.progressPercent ?? 0,
    lastOpenedAt:    persisted[book.id]?.lastOpenedAt    ?? null,
  }));
}

export function useBooks() {
  const [persisted, setPersisted] = useState(loadPersisted);
  const [books, setBooks] = useState(() => mergeBooksWithState(loadPersisted()));

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted)); } catch {}
  }, [persisted]);

  const patchBook = useCallback((id, patch) => {
    setPersisted(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
    setBooks(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
  }, []);

  const toggleFavorite = useCallback((id) => {
    setBooks(prev => {
      const isFav = !prev.find(b => b.id === id)?.isFavorite;
      patchBook(id, { isFavorite: isFav });
      return prev.map(b => b.id === id ? { ...b, isFavorite: isFav } : b);
    });
  }, [patchBook]);

  const setLastReadPage = useCallback((id, page, totalPages) => {
    const pct = totalPages > 1 ? Math.round(((page - 1) / (totalPages - 1)) * 100) : 100;
    patchBook(id, { lastReadPage: page, progressPercent: pct, lastOpenedAt: Date.now() });
  }, [patchBook]);

  const addBookmark = useCallback((id, page) => {
    setBooks(prev => {
      const bk = prev.find(b => b.id === id);
      if (!bk || bk.bookmarks.includes(page)) return prev;
      const bookmarks = [...bk.bookmarks, page].sort((a, b) => a - b);
      patchBook(id, { bookmarks });
      return prev.map(b => b.id === id ? { ...b, bookmarks } : b);
    });
  }, [patchBook]);

  const removeBookmark = useCallback((id, page) => {
    setBooks(prev => {
      const bk = prev.find(b => b.id === id);
      if (!bk) return prev;
      const bookmarks = bk.bookmarks.filter(p => p !== page);
      patchBook(id, { bookmarks });
      return prev.map(b => b.id === id ? { ...b, bookmarks } : b);
    });
  }, [patchBook]);

  const markOpened = useCallback((id) => {
    patchBook(id, { lastOpenedAt: Date.now() });
  }, [patchBook]);

  return { books, toggleFavorite, setLastReadPage, addBookmark, removeBookmark, markOpened };
}
