import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createReport, fetchReports, updateReport } from '../lib/trust';

export function useTrustSafety() {
  const { user, role } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshReports = useCallback(async () => {
    if (!user?.id || role !== 'admin') return [];
    setLoading(true);
    setError(null);

    try {
      const rows = await fetchReports();
      setReports(rows);
      return rows;
    } catch (err) {
      setError(err.message || 'Failed to load reports.');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user?.id, role]);

  useEffect(() => {
    refreshReports();
  }, [refreshReports]);

  const submitReport = useCallback(async (payload) => {
    const report = await createReport(payload);
    return report;
  }, []);

  const updateReportStatus = useCallback(async (reportId, status, resolutionNote = '') => {
    const updated = await updateReport(reportId, { status, resolutionNote });
    setReports(prev => prev.map(report => report.id === reportId ? updated : report));
    return updated;
  }, []);

  return {
    reports,
    loading,
    error,
    refreshReports,
    submitReport,
    updateReportStatus,
  };
}
