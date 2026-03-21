import { useState } from "react";

export function useFeedQuery() {
  const [query, setQuery] = useState({
    search: "",
    selectedTags: [],
    sortBy: "latest",
  });

  const updateSearch = (value) => {
    setQuery((prev) => ({ ...prev, search: value }));
  };

  const toggleTag = (tag) => {
    setQuery((prev) => {
      const exists = prev.selectedTags.includes(tag);

      return {
        ...prev,
        selectedTags: exists
          ? prev.selectedTags.filter((t) => t !== tag)
          : [...prev.selectedTags, tag],
      };
    });
  };

  const updateSort = (value) => {
    setQuery((prev) => ({ ...prev, sortBy: value }));
  };

  return { query, updateSearch, toggleTag, updateSort };
}
