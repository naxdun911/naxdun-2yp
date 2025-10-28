import React, { useState, useMemo } from 'react';

interface ReportDownloadProps {
  apiUrl?: string;
}

const ReportDownload: React.FC<ReportDownloadProps> = ({ apiUrl }) => {
  const heatmapApiUrl = useMemo(
    () => apiUrl || import.meta.env.VITE_HEATMAP_API_URL || "http://localhost:3897",
    [apiUrl]
  );
  
  const [downloadingFormat, setDownloadingFormat] = useState<"pdf" | "csv" | null>(null);

  const downloadReport = async (format: "pdf" | "csv"): Promise<void> => {
    try {
      setDownloadingFormat(format);
      const response = await fetch(`${heatmapApiUrl}/reports/building-occupancy?format=${format}`);
      if (!response.ok) {
        throw new Error(`Failed to generate ${format.toUpperCase()} report`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      link.href = url;
      link.download = `crowd-report-${stamp}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      console.error("Report download failed:", downloadError);
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <div className="mb-8 bg-white border border-gray-100 rounded-2xl shadow-lg p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Snapshot Reports</h2>
          <p className="text-sm text-gray-600 mt-1">
            Capture the latest crowd snapshot as a PDF or CSV download.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => downloadReport("pdf")}
            disabled={downloadingFormat === "pdf"}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow hover:bg-blue-700 disabled:opacity-60"
          >
            {downloadingFormat === "pdf" ? "Preparing PDF..." : "Download PDF"}
          </button>
          <button
            onClick={() => downloadReport("csv")}
            disabled={downloadingFormat === "csv"}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gray-100 text-gray-800 text-sm font-semibold shadow hover:bg-gray-200 disabled:opacity-60"
          >
            {downloadingFormat === "csv" ? "Preparing CSV..." : "Download CSV"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportDownload;
