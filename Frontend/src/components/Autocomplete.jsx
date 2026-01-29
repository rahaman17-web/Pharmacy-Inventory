import { useState, forwardRef, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import api from "../api";

const AutoComplete = forwardRef(function AutoComplete({ value, onSelect, onEnter, placeholder, allItems, fullScreenList = false, allowCreate = true }, ref) {
  const [query, setQuery] = useState((value && value.name) || value || "");
  const [showList, setShowList] = useState(false);
  // Only lock when a proper selected object with an id is provided
  const [locked, setLocked] = useState(Boolean(value && typeof value === 'object' && value.id));
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const listItemRefs = useRef([]);
  const [portalStyle, setPortalStyle] = useState(null);

  // set both forwarded ref and local inputRef
  const setRefs = (el) => {
    inputRef.current = el;
    if (!ref) return;
    if (typeof ref === 'function') ref(el);
    else ref.current = el;
  };

  useEffect(() => {
    setQuery((value && value.name) || value || "");
    // Only lock when value is an object with a valid id (selected item)
    setLocked(Boolean(value && typeof value === 'object' && value.id));
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      // hide when click is outside both input and portal dropdown
      const target = e.target;
      if (inputRef.current && inputRef.current.contains(target)) return;
      if (dropdownRef.current && dropdownRef.current.contains(target)) return;
      setShowList(false);
    }
    function handleKey(e) {
      if (e.key === "Escape") setShowList(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  // Initialize suggestions with allItems when component mounts
  useEffect(() => {
    if (allItems && allItems.length > 0 && !locked) {
      setSuggestions(allItems);
    }
  }, [allItems]);

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions]);

  const getQueryStr = () => {
    if (typeof query === 'string') return query;
    if (query && typeof query === 'object') return query.name || '';
    return '';
  };

  // Fetch suggestions when query changes (debounced)
  useEffect(() => {
    if (locked) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const qStr = getQueryStr();
        if (!qStr || qStr.trim() === "") {
          // Show all available items if provided, otherwise empty
          setSuggestions(allItems || []);
          return;
        }
        // Filter from allItems if provided, otherwise fetch from API
        if (allItems && allItems.length > 0) {
          const filtered = allItems.filter(item => 
            item.name.toLowerCase().includes(qStr.toLowerCase()) ||
            (item.formula && item.formula.toLowerCase().includes(qStr.toLowerCase())) ||
            (item.sku && item.sku.toLowerCase().includes(qStr.toLowerCase())) ||
            (item.category && item.category.toLowerCase().includes(qStr.toLowerCase()))
          );
          setSuggestions(filtered);
        } else {
          const { data } = await api.get(`/products?q=${encodeURIComponent(query)}`);
          setSuggestions(data || []);
        }
      } catch (err) {
        console.error("Autocomplete fetch failed", err);
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, locked, allItems]);

  const handleSelect = (item) => {
    // item may be a product object from API or a string
    const selectedName = item && typeof item === 'object' ? item.name : item;
    if (onSelect) onSelect(item && typeof item === 'object' && item.id ? item : { id: null, name: selectedName });
    setQuery(selectedName || '');
    setLocked(true);
    setShowList(false);
    if (onEnter) onEnter();
  };

  // Reposition portal while visible on scroll/resize
  useEffect(() => {
    if (!showList || fullScreenList) return;
    const handlePos = () => {
      if (!inputRef.current) return;
      const rect = inputRef.current.getBoundingClientRect();
      setPortalStyle({ top: rect.bottom, left: rect.left, width: rect.width });
    };
    window.addEventListener('scroll', handlePos, true);
    window.addEventListener('resize', handlePos);
    return () => {
      window.removeEventListener('scroll', handlePos, true);
      window.removeEventListener('resize', handlePos);
    };
  }, [showList, fullScreenList]);

  return (
    <div className="relative" ref={containerRef}>
      <input
        ref={setRefs}
        type="text"
        value={typeof query === 'object' ? (query.name || '') : query}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder={placeholder || "Type to search..."}
        onChange={(e) => {
          const newVal = e.target.value;
          setQuery(newVal);
          if (locked) {
            if (newVal === "") {
              setLocked(false);
              setShowList(true);
            } else {
              setShowList(false);
            }
          } else {
            setShowList(true);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setShowList(false);
            return;
          }
          if (e.key === "ArrowDown" && !showList) {
            e.preventDefault();
            setShowList(true);
            // If no query, show all items
            const qStr = getQueryStr();
            if ((!qStr || qStr.trim() === "") && allItems && allItems.length > 0) {
              setSuggestions(allItems);
            }
            return;
          }
          if (e.key === "Enter") {
            e.preventDefault();
            if (showList && suggestions.length > 0) {
              // Dropdown is open, select first item
              const selected = suggestions[0];
              handleSelect(selected);
            } else if (!showList) {
              // Dropdown is closed, open it
              setShowList(true);
              const qStr = getQueryStr();
              if ((!qStr || qStr.trim() === "") && allItems && allItems.length > 0) {
                setSuggestions(allItems);
              }
            }
          }
        }}
        onFocus={() => {
          // Position portal but don't auto-open
          if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            setPortalStyle({ top: rect.bottom, left: rect.left, width: rect.width });
          }
        }}
        onClick={() => {
          if (!locked) {
            setShowList(true);
            // If no query, show all items
            const qStr = getQueryStr();
            if ((!qStr || qStr.trim() === "") && allItems && allItems.length > 0) {
              setSuggestions(allItems);
            }
          }
        }}
              />
      {showList && !locked && (
        fullScreenList
          ? createPortal(
              <div
                ref={dropdownRef}
                className="fixed inset-0 z-[99999] bg-black/30 backdrop-blur-sm flex justify-center pt-10 px-4 overflow-hidden"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setShowList(false);
                }}
              >
                <div className="w-full max-w-5xl bg-white border border-gray-200 rounded-2xl shadow-2xl max-h-[70vh] flex flex-col">
                  <div className="px-4 py-3 border-b bg-gray-50 flex-shrink-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">Select item</span>
                      <button onClick={() => setShowList(false)} className="text-gray-500 hover:text-gray-800">✕</button>
                    </div>
                    <input
                      type="text"
                      value={typeof query === 'object' ? (query.name || '') : query}
                      onChange={(e) => {
                        const newVal = e.target.value;
                        setQuery(newVal);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && suggestions.length > 0) {
                          e.preventDefault();
                          handleSelect(suggestions[selectedIndex]);
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          setShowList(false);
                        } else if (e.key === "ArrowDown") {
                          e.preventDefault();
                          const newIndex = selectedIndex < suggestions.length - 1 ? selectedIndex + 1 : 0;
                          setSelectedIndex(newIndex);
                          listItemRefs.current[newIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          const newIndex = selectedIndex > 0 ? selectedIndex - 1 : suggestions.length - 1;
                          setSelectedIndex(newIndex);
                          listItemRefs.current[newIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                        }
                      }}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Type to search..."
                      autoFocus
                    />
                  </div>
                  <div className="overflow-y-auto flex-1">
                  <ul>
                    {suggestions.map((item, index) => (
                      <li
                        key={item.id || index}
                        ref={(el) => (listItemRefs.current[index] = el)}
                        className={`p-3 cursor-pointer border-b last:border-b-0 transition-colors ${
                          index === selectedIndex ? 'bg-blue-100 border-l-4 border-l-blue-600' : 'hover:bg-blue-50'
                        }`}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 pr-4">
                            <div className="font-semibold text-gray-800 truncate">{item.name}</div>
                            {(item.formula || item.sku) && <div className="text-xs text-gray-500 mt-1 truncate">{item.formula ? `Formula/SKU: ${item.formula}` : `SKU: ${item.sku}`}</div>}
                            {item.category && <div className="text-xs text-gray-500 mt-1 truncate">Category: {item.category}</div>}
                            {item.pack_size > 1 && <div className="text-xs text-purple-600 mt-1 font-medium">Pack: {item.pack_size} units</div>}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-xs text-gray-500">Sale Price</div>
                            <div className="font-semibold text-green-600">{Math.round(Number(item.selling_price ?? item.mrp ?? 0))}</div>
                            <div className="text-xs text-blue-600 mt-1">Per unit: {Number(item.selling_price ?? item.mrp ?? 0).toFixed(2)}</div>
                          </div>
                        </div>
                      </li>
                    ))}

                    {allowCreate && getQueryStr() && getQueryStr().trim() !== "" && suggestions.length === 0 && (
                      <li
                        className="p-3 bg-green-50 hover:bg-green-100 cursor-pointer text-green-700 font-medium border-t-2 border-green-200 transition-colors"
                        onClick={async () => {
                          try {
                            const api = (await import("../api")).default;
                            const payload = { name: getQueryStr() };
                            const { data } = await api.post("/products", payload);
                            handleSelect(data);
                          } catch (err) {
                            console.error("Create product failed", err);
                            alert(err.response?.data?.error || "Failed to create product");
                          }
                        }}
                      >
                        <div className="flex items-center">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Create new: "{getQueryStr()}"
                        </div>
                      </li>
                    )}

                    {suggestions.length === 0 && (!getQueryStr() || getQueryStr().trim() === "") && !allItems && (
                      <li className="p-3 text-gray-400 text-center">Start typing to search...</li>
                    )}

                    {suggestions.length === 0 && (!getQueryStr() || getQueryStr().trim() === "") && allItems && allItems.length === 0 && (
                      <li className="p-3 text-gray-400 text-center">No items available</li>
                    )}
                  </ul>
                  </div>
                </div>
              </div>,
              document.body
            )
          : (portalStyle &&
              createPortal(
                <div ref={dropdownRef} style={{ position: 'fixed', top: portalStyle.top + 'px', left: portalStyle.left + 'px', width: portalStyle.width + 'px', zIndex: 99999, pointerEvents: 'auto' }}>
                  <div className="bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-auto">
                    <ul>
                      {suggestions.map((item, index) => (
                        <li
                          key={item.id || index}
                          className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors"
                          onClick={() => handleSelect(item)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 pr-4">
                              <div className="font-semibold text-gray-800 truncate">{item.name}</div>
                              {(item.formula || item.sku) && <div className="text-xs text-gray-500 mt-1 truncate">{item.formula ? `Formula/SKU: ${item.formula}` : `SKU: ${item.sku}`}</div>}
                              {item.category && <div className="text-xs text-gray-500 mt-1 truncate">Category: {item.category}</div>}
                              {item.pack_size > 1 && <div className="text-xs text-purple-600 mt-1 font-medium">Pack: {item.pack_size} units</div>}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-xs text-gray-500">Sale Price</div>
                              <div className="font-semibold text-green-600">{Math.round(Number(item.selling_price ?? item.mrp ?? 0))}</div>
                              <div className="text-xs text-blue-600 mt-1">Per unit: {Number(item.selling_price ?? item.mrp ?? 0).toFixed(2)}</div>
                            </div>
                          </div>
                        </li>
                      ))}

                      {allowCreate && getQueryStr() && getQueryStr().trim() !== "" && suggestions.length === 0 && (
                        <li
                          className="p-3 bg-green-50 hover:bg-green-100 cursor-pointer text-green-700 font-medium border-t-2 border-green-200 transition-colors"
                          onClick={async () => {
                            try {
                              const api = (await import("../api")).default;
                              const payload = { name: getQueryStr() };
                              const { data } = await api.post("/products", payload);
                              handleSelect(data);
                            } catch (err) {
                              console.error("Create product failed", err);
                              alert(err.response?.data?.error || "Failed to create product");
                            }
                          }}
                        >
                          <div className="flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Create new: "{getQueryStr()}"
                          </div>
                        </li>
                      )}

                      {suggestions.length === 0 && (!getQueryStr() || getQueryStr().trim() === "") && !allItems && (
                        <li className="p-3 text-gray-400 text-center">Start typing to search...</li>
                      )}

                      {suggestions.length === 0 && (!getQueryStr() || getQueryStr().trim() === "") && allItems && allItems.length === 0 && (
                        <li className="p-3 text-gray-400 text-center">No items available</li>
                      )}
                    </ul>
                  </div>
                </div>,
                document.body
              ))
      )}
    </div>
  );
});

export default AutoComplete;
