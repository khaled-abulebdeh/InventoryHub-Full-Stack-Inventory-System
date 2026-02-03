import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Calendar } from 'lucide-react';

interface SmartDateInputProps {
    value?: string; // YYYY-MM-DD
    onChange: (value: string) => void;
    placeholder?: string;
    hasError?: boolean;
    className?: string;
}

export function SmartDateInput({ value, onChange, hasError, className }: SmartDateInputProps) {
    const [internalValue, setInternalValue] = useState('');

    // Sync external value
    useEffect(() => {
        setInternalValue(value || '');
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        // Prevent typing more than 10 characters (YYYY-MM-DD)
        if (newValue.length > 10) return;

        setInternalValue(newValue);
        onChange(newValue);
    };

    return (
        <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
                type="date"
                max="9999-12-31"
                value={internalValue}
                onChange={handleChange}
                className={`pl-9 ${hasError ? 'border-red-500 focus-visible:ring-red-500' : ''} ${className}`}
            />
        </div>
    );
}
