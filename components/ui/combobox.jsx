"use client";

// A writable, filterable single-select: it looks and behaves like a text
// input (you can type to narrow the list down), but the value is always one
// of the given options - typing never creates a free-text value. Built from
// scratch (no popover/command library is installed in this project) to
// replace the plain <select> product pickers on the order/purchase forms,
// which get unwieldy to scroll through once there are a lot of products.
//
// Props:
//   options        - array of arbitrary option objects
//   value          - the currently selected option's id (getOptionValue(opt))
//   onChange(id)   - called with the newly selected option's id
//   getOptionValue(opt) -> string/id (defaults to opt._id)
//   getOptionLabel(opt) -> string shown in the input once selected, and used
//                          for filtering (defaults to opt.name)
//   renderOption(opt) -> ReactNode for the dropdown row (defaults to the label)
//   placeholder    - shown when nothing is selected
//   disabled
//   emptyMessage   - shown when there are no matching options

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronsUpDown, X } from "lucide-react";

export function Combobox({
  options = [],
  value,
  onChange,
  getOptionValue = (opt) => opt._id,
  getOptionLabel = (opt) => opt.name,
  renderOption,
  placeholder = "Select...",
  disabled = false,
  emptyMessage = "No matches",
  className = "",
  id,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selectedOption = useMemo(
    () => options.find((opt) => getOptionValue(opt) === value),
    [options, value, getOptionValue]
  );

  // What the input actually shows: the free-typed filter text while open,
  // otherwise the selected option's label (or blank).
  const displayValue = open ? query : selectedOption ? getOptionLabel(selectedOption) : "";

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => getOptionLabel(opt).toLowerCase().includes(q));
  }, [options, query, getOptionLabel]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, open]);

  const selectOption = (opt) => {
    onChange(getOptionValue(opt));
    setQuery("");
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlightedIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filteredOptions[highlightedIndex];
      if (opt) selectOption(opt);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          type="text"
          value={displayValue}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="w-full p-2 pr-16 border rounded-md focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
          autoComplete="off"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {selectedOption && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setQuery("");
                inputRef.current?.focus();
              }}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronsUpDown className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border bg-white shadow-lg">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">{emptyMessage}</div>
          ) : (
            filteredOptions.map((opt, index) => {
              const optValue = getOptionValue(opt);
              const isSelected = optValue === value;
              const isHighlighted = index === highlightedIndex;
              return (
                <div
                  key={optValue}
                  onMouseDown={(e) => {
                    // mousedown (not click) so this fires before the input's
                    // onBlur/outside-click handler would close the dropdown
                    e.preventDefault();
                    selectOption(opt);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`px-3 py-2 text-sm cursor-pointer ${
                    isHighlighted ? "bg-blue-50" : ""
                  } ${isSelected ? "font-medium text-blue-700" : "text-gray-900"}`}
                >
                  {renderOption ? renderOption(opt) : getOptionLabel(opt)}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
