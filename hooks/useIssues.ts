"use client";

import { useState, useEffect } from "react";
import { subscribeToIssues } from "@/lib/firestore";
import { Issue, IssueFilter } from "@/types";

export function useIssues(filters: IssueFilter = {}) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [rawIssues, setRawIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe ONCE to the raw top issues feed
  useEffect(() => {
    const unsubscribe = subscribeToIssues({}, (data) => {
      setRawIssues(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Apply filters locally in memory on rawIssues updates or filters change
  useEffect(() => {
    let filtered = [...rawIssues];
    if (filters.category) {
      filtered = filtered.filter((i) => i.category === filters.category);
    }
    if (filters.status) {
      filtered = filtered.filter((i) => i.status === filters.status);
    }
    if (filters.severity) {
      filtered = filtered.filter((i) => i.severity === filters.severity);
    }
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.location?.address?.toLowerCase().includes(q)
      );
    }
    setIssues(filtered);
  }, [
    rawIssues,
    filters.category,
    filters.status,
    filters.severity,
    filters.searchQuery,
  ]);

  return { issues, loading };
}
