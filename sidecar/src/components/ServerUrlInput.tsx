import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { validateServerUrl } from '../api/client';

interface ServerUrlInputProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

export function ServerUrlInput({ value, onChange, disabled }: ServerUrlInputProps) {
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    const validationError = validateServerUrl(value);
    setError(validationError);
  }, [value]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setError(null);
  }, []);

  const handleChange = useCallback(
    (text: string) => {
      onChange(text);
      // Clear error while typing
      if (error) setError(null);
    },
    [onChange, error]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Server URL</Text>
      <TextInput
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          error && styles.inputError,
          disabled && styles.inputDisabled,
        ]}
        value={value}
        onChangeText={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder="http://192.168.1.XX:8080"
        placeholderTextColor="#4b5563"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        editable={!disabled}
        selectTextOnFocus
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
      <Text style={styles.hintText}>
        Enter your computer's local IP address (not localhost)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#f9fafb',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputFocused: {
    borderColor: '#3b82f6',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  inputDisabled: {
    opacity: 0.5,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 6,
  },
  hintText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
  },
});
