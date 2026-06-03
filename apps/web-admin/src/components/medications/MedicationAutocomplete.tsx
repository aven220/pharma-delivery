import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { medicationsApi } from '@/services/api';
import { Input } from '@/components/ui/input';

export interface MedicationOption {
  id: string;
  cum: string | null;
  code: string;
  name: string;
  presentation: string | null;
  concentration: string | null;
  laboratory: string | null;
}

interface Props {
  value?: MedicationOption | null;
  onSelect: (med: MedicationOption) => void;
  placeholder?: string;
}

export function MedicationAutocomplete({ value, onSelect, placeholder }: Props) {
  const [query, setQuery] = useState(value?.name || '');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: options = [] } = useQuery({
    queryKey: ['medication-search', query],
    queryFn: async () => {
      if (query.length < 2) return [];
      const res = await medicationsApi.search(query);
      return res.data.data as MedicationOption[];
    },
    enabled: query.length >= 2,
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (med: MedicationOption) => {
    setQuery(med.name);
    setOpen(false);
    onSelect(med);
  };

  return (
    <div ref={ref} className="relative">
      <Input
        value={query}
        placeholder={placeholder || 'Buscar por CUM o nombre...'}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && options.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-background shadow-lg">
          {options.map((med) => (
            <li
              key={med.id}
              className="cursor-pointer px-3 py-2 text-sm hover:bg-muted"
              onClick={() => handleSelect(med)}
            >
              <span className="font-medium">{med.name}</span>
              {med.cum && <span className="ml-2 text-muted-foreground">CUM: {med.cum}</span>}
              {med.presentation && <span className="ml-2 text-muted-foreground">{med.presentation}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
