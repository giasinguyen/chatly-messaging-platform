import { useState, useCallback, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { messageService } from '@/services/message.service';
import type { Message } from '@/types/message';

interface MessageSearchProps {
  conversationId: string;
  onClose: () => void;
  onNavigateToMessage: (messageId: string) => void;
  onKeywordChange?: (keyword: string) => void;
}

export function MessageSearch({ conversationId, onClose, onNavigateToMessage, onKeywordChange }: MessageSearchProps) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await messageService.search(conversationId, q.trim(), 0, 50);
      setResults(res.result ?? []);
      setCurrentIndex(0);
      if (res.result?.length > 0) {
        onNavigateToMessage(res.result[0].id);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId, onNavigateToMessage]);

  const handleChange = (value: string) => {
    setKeyword(value);
    onKeywordChange?.(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 400);
  };

  const navigatePrev = () => {
    if (results.length === 0) return;
    const newIdx = (currentIndex - 1 + results.length) % results.length;
    setCurrentIndex(newIdx);
    onNavigateToMessage(results[newIdx].id);
  };

  const navigateNext = () => {
    if (results.length === 0) return;
    const newIdx = (currentIndex + 1) % results.length;
    setCurrentIndex(newIdx);
    onNavigateToMessage(results[newIdx].id);
  };

  return (
    <View
      className="flex-row items-center px-3 py-2"
      style={{ backgroundColor: Colors.bg, borderBottomWidth: 0.5, borderBottomColor: Colors.borderLight }}
    >
      <Ionicons name="search" size={18} color={Colors.textMuted} />
      <TextInput
        autoFocus
        value={keyword}
        onChangeText={handleChange}
        placeholder="Search messages..."
        placeholderTextColor={Colors.textLight}
        className="mx-2 flex-1 text-sm"
        style={{ color: Colors.text, height: 34 }}
      />
      {loading && <ActivityIndicator size="small" color={Colors.cta} />}
      {searched && !loading && results.length > 0 && (
        <Text className="mr-2 text-xs" style={{ color: Colors.textMuted }}>
          {currentIndex + 1}/{results.length}
        </Text>
      )}
      {searched && !loading && results.length === 0 && keyword.trim() !== '' && (
        <Text className="mr-2 text-xs" style={{ color: Colors.textMuted }}>
          No results
        </Text>
      )}
      <TouchableOpacity onPress={navigatePrev} disabled={results.length === 0} className="p-1">
        <Ionicons name="chevron-up" size={18} color={results.length > 0 ? Colors.text : Colors.textLight} />
      </TouchableOpacity>
      <TouchableOpacity onPress={navigateNext} disabled={results.length === 0} className="p-1">
        <Ionicons name="chevron-down" size={18} color={results.length > 0 ? Colors.text : Colors.textLight} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onClose} className="ml-1 p-1">
        <Ionicons name="close" size={18} color={Colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}
