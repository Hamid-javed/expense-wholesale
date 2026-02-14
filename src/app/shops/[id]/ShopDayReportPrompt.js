"use client";

import { useState } from "react";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";

export function ShopDayReportPrompt({ shopId, reportDate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [otName, setOtName] = useState("");
  const [date, setDate] = useState(
    () => reportDate || new Date().toISOString().slice(0, 10)
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("date", reportDate);
    if (otName?.trim()) params.set("ot", otName.trim());
    if (date) params.set("otDate", date);
    const url = `/api/invoices/shop/${shopId}?${params.toString()}`;
    window.open(url, "_blank");
    setIsOpen(false);
    setOtName("");
    setDate(reportDate || new Date().toISOString().slice(0, 10));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDate(reportDate || new Date().toISOString().slice(0, 10));
          setIsOpen(true);
        }}
        className="text-xs text-slate-600 underline hover:text-slate-900"
      >
        Download / Print Day Report
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
            aria-hidden
          />
          <div
            className="relative z-10 mx-4 w-full max-w-sm rounded-lg bg-white p-4 shadow-xl sm:mx-0 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="day-report-dialog-title"
          >
            <h3
              id="day-report-dialog-title"
              className="mb-4 text-base font-semibold text-slate-900"
            >
              Day Report details
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="OT (Order Taker) name"
                value={otName}
                onChange={(e) => setOtName(e.target.value)}
                placeholder="Enter order taker name"
                required
              />
              <Input
                label="Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Download</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
