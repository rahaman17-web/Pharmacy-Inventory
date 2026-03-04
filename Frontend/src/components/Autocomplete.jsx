import {
  useState,
  forwardRef,
  useEffect,
  useRef,
  useImperativeHandle,
} from "react";
import { createPortal } from "react-dom";
import api from "../api";

const AutoComplete = forwardRef(function AutoComplete(
  {
    value,
    onSelect,
    onEnter,
    placeholder,
    allItems,
    supplierId = null,
    fullScreenList = false,
    allowCreate = true,
    inputStyle,
    inputClassName,
    stockData = {},
  },
  ref,
) {
  const [query, setQuery] = useState((value && value.name) || value || "");
  const [showList, setShowList] = useState(false);
  // Only lock when a proper selected object with an id is provided
  const [locked, setLocked] = useState(
    Boolean(value && typeof value === "object" && value.id),
  );
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const listItemRefs = useRef([]);
  const [portalStyle, setPortalStyle] = useState(null);

  // Only set local ref; forwarded ref is handled by useImperativeHandle below
  const setRefs = (el) => {
    inputRef.current = el;
  };

  useImperativeHandle(
    ref,
    () => ({
      focus: () => inputRef.current?.focus(),
      closeDropdown: () => setShowList(false),
      openDropdown: () => {
        setQuery("");
        setLocked(false);
        setSuggestions(allItems || []);
        setSelectedIndex(0);
        setShowList(true);
        if (inputRef.current) {
          const rect = inputRef.current.getBoundingClientRect();
          setPortalStyle({
            top: rect.bottom,
            left: rect.left,
            width: rect.width,
          });
        }
        setTimeout(() => inputRef.current?.focus(), 0);
      },
      reset: () => {
        setQuery("");
        setLocked(false);
        setSuggestions(allItems || []);
        setSelectedIndex(0);
        setShowList(true);
        if (inputRef.current) {
          const rect = inputRef.current.getBoundingClientRect();
          setPortalStyle({
            top: rect.bottom,
            left: rect.left,
            width: rect.width,
          });
        }
        setTimeout(() => inputRef.current?.focus(), 0);
      },
    }),
    [allItems],
  );

  useEffect(() => {
    setQuery((value && value.name) || value || "");
    // Only lock when value is an object with a valid id (selected item)
    setLocked(Boolean(value && typeof value === "object" && value.id));
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
    if (locked) return;
    if (allItems && allItems.length > 0) {
      const qStr = getQueryStr();
      if (!qStr || qStr.trim() === "") {
        setSuggestions(allItems);
      } else {
        const filtered = allItems.filter(
          (item) =>
            item.name.toLowerCase().includes(qStr.toLowerCase()) ||
            (item.formula &&
              item.formula.toLowerCase().includes(qStr.toLowerCase())) ||
            (item.category &&
              item.category.toLowerCase().includes(qStr.toLowerCase())),
        );
        setSuggestions(filtered.length > 0 ? filtered : []);
      }
    }
  }, [allItems]);

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions]);

  const getQueryStr = () => {
    if (typeof query === "string") return query;
    if (query && typeof query === "object") return query.name || "";
    return "";
  };

  // Fetch suggestions when query or supplierId changes (debounced)
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
          const filtered = allItems.filter(
            (item) =>
              item.name.toLowerCase().includes(qStr.toLowerCase()) ||
              (item.formula &&
                item.formula.toLowerCase().includes(qStr.toLowerCase())) ||
              (item.sku &&
                item.sku.toLowerCase().includes(qStr.toLowerCase())) ||
              (item.category &&
                item.category.toLowerCase().includes(qStr.toLowerCase())),
          );
          if (filtered.length > 0) {
            setSuggestions(filtered);
          } else if (!supplierId) {
            // Only fall back to full API when NO supplier is restricted
            const { data } = await api.get(
              `/products?q=${encodeURIComponent(qStr)}`,
            );
            setSuggestions(data || []);
          } else {
            // Supplier is selected but no local match — search API scoped to that supplier
            const { data } = await api.get(
              `/products?q=${encodeURIComponent(qStr)}&supplier_id=${supplierId}`,
            );
            setSuggestions(data || []);
          }
        } else if (supplierId) {
          // No allItems yet but supplier selected — search API scoped to supplier
          const { data } = await api.get(
            `/products?q=${encodeURIComponent(qStr)}&supplier_id=${supplierId}`,
          );
          setSuggestions(data || []);
        } else {
          const { data } = await api.get(
            `/products?q=${encodeURIComponent(qStr)}`,
          );
          setSuggestions(data || []);
        }
      } catch (err) {
        console.error("Autocomplete fetch failed", err);
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, locked, allItems, supplierId]);

  const displayLabel = (item) => {
    if (!item || typeof item !== "object") return item || "";
    return item.category ? `${item.category} ${item.name}` : item.name || "";
  };

  const handleSelect = (item) => {
    // item may be a product object from API or a string
    const selectedName =
      item && typeof item === "object" ? displayLabel(item) : item;
    if (onSelect)
      onSelect(
        item && typeof item === "object" && item.id
          ? item
          : { id: null, name: selectedName },
      );
    setQuery(selectedName || "");
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
    window.addEventListener("scroll", handlePos, true);
    window.addEventListener("resize", handlePos);
    return () => {
      window.removeEventListener("scroll", handlePos, true);
      window.removeEventListener("resize", handlePos);
    };
  }, [showList, fullScreenList]);

  return (
    <div className="relative" ref={containerRef}>
      <input
        ref={setRefs}
        type="text"
        value={typeof query === "object" ? query.name || "" : query}
        className={
          inputClassName ||
          "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        }
        style={inputStyle}
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
          if (e.key === "ArrowDown") {
            e.preventDefault();
            if (!showList) {
              setShowList(true);
              const qStr = getQueryStr();
              if (
                (!qStr || qStr.trim() === "") &&
                allItems &&
                allItems.length > 0
              )
                setSuggestions(allItems);
            } else {
              const newIndex =
                selectedIndex < suggestions.length - 1 ? selectedIndex + 1 : 0;
              setSelectedIndex(newIndex);
              listItemRefs.current[newIndex]?.scrollIntoView({
                block: "nearest",
                behavior: "smooth",
              });
            }
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            if (showList) {
              const newIndex =
                selectedIndex > 0 ? selectedIndex - 1 : suggestions.length - 1;
              setSelectedIndex(newIndex);
              listItemRefs.current[newIndex]?.scrollIntoView({
                block: "nearest",
                behavior: "smooth",
              });
            }
            return;
          }
          if (e.key === "Enter") {
            e.preventDefault();
            if (showList && suggestions.length > 0) {
              handleSelect(suggestions[selectedIndex]);
            } else if (!showList) {
              setShowList(true);
              const qStr = getQueryStr();
              if (
                (!qStr || qStr.trim() === "") &&
                allItems &&
                allItems.length > 0
              )
                setSuggestions(allItems);
            }
          }
        }}
        onFocus={() => {
          if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            setPortalStyle({
              top: rect.bottom,
              left: rect.left,
              width: rect.width,
            });
          }
        }}
        onClick={() => {
          // fullScreenList mode: only open via Enter key or openDropdown() call, not on click
          if (!locked && !fullScreenList) {
            setShowList(true);
            // If no query, show all items
            const qStr = getQueryStr();
            if (
              (!qStr || qStr.trim() === "") &&
              allItems &&
              allItems.length > 0
            ) {
              setSuggestions(allItems);
            }
          }
        }}
      />
      {showList &&
        !locked &&
        (fullScreenList
          ? createPortal(
              <div
                ref={dropdownRef}
                className="fixed inset-0 z-[99999] bg-black/30 backdrop-blur-sm flex justify-center pt-6 px-2 overflow-hidden"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setShowList(false);
                    setTimeout(() => inputRef.current?.focus(), 50);
                  }
                }}
              >
                <div className="w-full max-w-[98vw] bg-white border border-gray-200 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
                  <div className="px-4 py-3 border-b bg-gray-50 flex-shrink-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">
                        Select Item
                      </span>
                      <button
                        onClick={() => {
                          setShowList(false);
                          setTimeout(() => inputRef.current?.focus(), 50);
                        }}
                        className="text-gray-500 hover:text-gray-800"
                      >
                        ✕
                      </button>
                    </div>
                    <input
                      type="text"
                      value={
                        typeof query === "object" ? query.name || "" : query
                      }
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
                          const newIndex =
                            selectedIndex < suggestions.length - 1
                              ? selectedIndex + 1
                              : 0;
                          setSelectedIndex(newIndex);
                          listItemRefs.current[newIndex]?.scrollIntoView({
                            block: "nearest",
                            behavior: "smooth",
                          });
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          const newIndex =
                            selectedIndex > 0
                              ? selectedIndex - 1
                              : suggestions.length - 1;
                          setSelectedIndex(newIndex);
                          listItemRefs.current[newIndex]?.scrollIntoView({
                            block: "nearest",
                            behavior: "smooth",
                          });
                        }
                      }}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Type to search..."
                      autoFocus
                    />
                  </div>
                  <div className="overflow-y-auto flex-1">
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 12,
                      }}
                    >
                      <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                        <tr style={{ background: "#1a1a1a", color: "#fff" }}>
                          {[
                            "PRODUCT NAME",
                            "P.PRICE",
                            "S.PRICE",
                            "SP PACK",
                            "PP PACK",
                            "PIECES IN PACK",
                            "STOCK",
                          ].map((h) => (
                            <th
                              key={h}
                              style={{
                                padding: "6px 10px",
                                textAlign:
                                  h === "PRODUCT NAME" ? "left" : "right",
                                whiteSpace: "nowrap",
                                fontWeight: 700,
                                fontSize: 11,
                                borderRight: "1px solid #444",
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {suggestions.map((item, index) => {
                          const stockPcs = Number(
                            stockData[item.id] ?? item.opening_qty ?? 0,
                          );
                          const packSz = Number(item.pack_size || 1);
                          const purPc = Number(item.purchase_price || 0);
                          const spPiece = Number(item.selling_price || 0);
                          const spPack =
                            Number(item.pack_sale_price || 0) ||
                            spPiece * packSz;
                          const ppPack = purPc * packSz;
                          const isSelected = index === selectedIndex;
                          const rowBg = isSelected
                            ? "#b8d4ff"
                            : index % 2 === 0
                              ? "#ffffff"
                              : "#f0f0f0";
                          return (
                            <tr
                              key={item.id || index}
                              ref={(el) => (listItemRefs.current[index] = el)}
                              style={{
                                background: rowBg,
                                cursor: "pointer",
                                borderBottom: "1px solid #ddd",
                              }}
                              onClick={() => handleSelect(item)}
                              onMouseEnter={() => setSelectedIndex(index)}
                            >
                              <td
                                style={{
                                  padding: "4px 10px",
                                  fontWeight: 600,
                                  color: "#111",
                                  whiteSpace: "nowrap",
                                  maxWidth: 300,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  borderRight: "1px solid #ddd",
                                }}
                              >
                                {item.category ? (
                                  <>
                                    <span
                                      style={{
                                        color: "#6d28d9",
                                        marginRight: 4,
                                        fontSize: 10,
                                        fontWeight: 700,
                                        background: "#ede9fe",
                                        padding: "1px 5px",
                                        borderRadius: 3,
                                      }}
                                    >
                                      {item.category}
                                    </span>
                                    {item.name}
                                  </>
                                ) : (
                                  item.name
                                )}
                              </td>
                              <td
                                style={{
                                  padding: "4px 10px",
                                  textAlign: "right",
                                  color: "#7c2d12",
                                  borderRight: "1px solid #ddd",
                                }}
                              >
                                {purPc > 0 ? purPc.toFixed(2) : ""}
                              </td>
                              <td
                                style={{
                                  padding: "4px 10px",
                                  textAlign: "right",
                                  color: "#1a1a8c",
                                  borderRight: "1px solid #ddd",
                                }}
                              >
                                {spPiece > 0 ? spPiece.toFixed(2) : ""}
                              </td>
                              <td
                                style={{
                                  padding: "4px 10px",
                                  textAlign: "right",
                                  color: "#1a1a8c",
                                  borderRight: "1px solid #ddd",
                                }}
                              >
                                {spPack > 0 ? spPack.toFixed(2) : ""}
                              </td>
                              <td
                                style={{
                                  padding: "4px 10px",
                                  textAlign: "right",
                                  color: "#7c2d12",
                                  borderRight: "1px solid #ddd",
                                }}
                              >
                                {ppPack > 0 ? ppPack.toFixed(2) : ""}
                              </td>
                              <td
                                style={{
                                  padding: "4px 10px",
                                  textAlign: "right",
                                  color: "#333",
                                  borderRight: "1px solid #ddd",
                                }}
                              >
                                {packSz}
                              </td>
                              <td
                                style={{
                                  padding: "4px 10px",
                                  textAlign: "right",
                                  fontWeight: 700,
                                  color: stockPcs > 0 ? "#166534" : "#dc2626",
                                }}
                              >
                                {stockPcs}
                              </td>
                            </tr>
                          );
                        })}
                        {suggestions.length === 0 && (
                          <tr>
                            <td
                              colSpan={7}
                              style={{
                                padding: "16px",
                                textAlign: "center",
                                color: "#888",
                              }}
                            >
                              {getQueryStr() && getQueryStr().trim() !== ""
                                ? "No products found"
                                : "Start typing to search..."}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>,
              document.body,
            )
          : portalStyle &&
            createPortal(
              <div
                ref={dropdownRef}
                style={{
                  position: "fixed",
                  top: portalStyle.top + "px",
                  left: portalStyle.left + "px",
                  width: portalStyle.width + "px",
                  zIndex: 99999,
                  pointerEvents: "auto",
                }}
              >
                <div className="bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-auto">
                  <ul>
                    {suggestions.map((item, index) => (
                      <li
                        key={item.id || index}
                        ref={(el) => (listItemRefs.current[index] = el)}
                        className={`p-3 cursor-pointer border-b last:border-b-0 transition-colors ${index === selectedIndex ? "bg-blue-100 border-l-4 border-l-blue-600" : "hover:bg-blue-50"}`}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 pr-4">
                            <div className="font-semibold text-gray-800 truncate">
                              {item.category ? (
                                <>
                                  <span
                                    style={{
                                      color: "#6d28d9",
                                      marginRight: 4,
                                      fontSize: 10,
                                      fontWeight: 700,
                                      background: "#ede9fe",
                                      padding: "1px 4px",
                                      borderRadius: 3,
                                    }}
                                  >
                                    {item.category}
                                  </span>
                                  {item.name}
                                </>
                              ) : (
                                item.name
                              )}
                            </div>
                            {(item.formula || item.sku) && (
                              <div className="text-xs text-gray-500 mt-1 truncate">
                                {item.formula
                                  ? `Formula/SKU: ${item.formula}`
                                  : `SKU: ${item.sku}`}
                              </div>
                            )}
                            {item.category && (
                              <div className="text-xs text-gray-500 mt-1 truncate">
                                Category: {item.category}
                              </div>
                            )}
                            {item.pack_size > 1 && (
                              <div className="text-xs text-purple-600 mt-1 font-medium">
                                Pack: {item.pack_size} units
                              </div>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-xs text-gray-500">
                              Sale Price
                            </div>
                            <div className="font-semibold text-green-600">
                              {Math.round(
                                Number(item.selling_price ?? item.mrp ?? 0),
                              )}
                            </div>
                            <div className="text-xs text-blue-600 mt-1">
                              Per unit:{" "}
                              {Number(
                                item.selling_price ?? item.mrp ?? 0,
                              ).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}

                    {allowCreate &&
                      getQueryStr() &&
                      getQueryStr().trim() !== "" &&
                      suggestions.length === 0 && (
                        <li
                          className="p-3 bg-green-50 hover:bg-green-100 cursor-pointer text-green-700 font-medium border-t-2 border-green-200 transition-colors"
                          onClick={async () => {
                            try {
                              const api = (await import("../api")).default;
                              const payload = { name: getQueryStr() };
                              const { data } = await api.post(
                                "/products",
                                payload,
                              );
                              handleSelect(data);
                            } catch (err) {
                              console.error("Create product failed", err);
                              alert(
                                err.response?.data?.error ||
                                  "Failed to create product",
                              );
                            }
                          }}
                        >
                          <div className="flex items-center">
                            <svg
                              className="w-5 h-5 mr-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                              />
                            </svg>
                            Create new: "{getQueryStr()}"
                          </div>
                        </li>
                      )}

                    {!allowCreate &&
                      getQueryStr() &&
                      getQueryStr().trim() !== "" &&
                      suggestions.length === 0 && (
                        <li className="p-3 text-center text-orange-600 bg-orange-50">
                          ⚠️ Product not found. Please add it from{" "}
                          <strong>Products</strong> first.
                        </li>
                      )}

                    {suggestions.length === 0 &&
                      (!getQueryStr() || getQueryStr().trim() === "") &&
                      !allItems && (
                        <li className="p-3 text-gray-400 text-center">
                          Start typing to search...
                        </li>
                      )}

                    {suggestions.length === 0 &&
                      (!getQueryStr() || getQueryStr().trim() === "") &&
                      allItems &&
                      allItems.length === 0 && (
                        <li className="p-3 text-gray-400 text-center">
                          No items available
                        </li>
                      )}
                  </ul>
                </div>
              </div>,
              document.body,
            ))}
    </div>
  );
});

export default AutoComplete;
