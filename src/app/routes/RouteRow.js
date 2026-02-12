"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Table, TR, TD } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { RouteAssignmentForm } from "./RouteAssignmentForm";

export function RouteRow({
  route,
  assignedStaff,
  staff,
  assignStaffToRoute,
  updateRoute,
  deleteRoute,
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(route.name);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  async function handleUpdate(e) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    const formData = new FormData();
    formData.set("id", route._id);
    formData.set("name", name.trim());

    const result = await updateRoute(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setIsEditing(false);
      router.refresh();
    }
  }

  function handleCancel() {
    setName(route.name);
    setIsEditing(false);
    setError(null);
  }

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete route "${route.name}"? This will unassign any staff from this route.`)) {
      return;
    }

    const formData = new FormData();
    formData.set("id", route._id);
    const result = await deleteRoute(formData);
    if (result?.error) {
      alert(result.error);
    } else {
      router.refresh();
    }
  }

  return (
    <TR>
      <TD>
        <div className="group relative">
          {isEditing ? (
            <form onSubmit={handleUpdate} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                onBlur={(e) => {
                  // Don't close if clicking on save/cancel buttons
                  if (!e.relatedTarget?.closest('form')) {
                    handleCancel();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    handleCancel();
                  }
                }}
              />
              <div className="flex items-center gap-1">
                <Button
                  type="submit"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onMouseDown={(e) => e.preventDefault()} // Prevent blur
                >
                  ✓
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={handleCancel}
                  onMouseDown={(e) => e.preventDefault()} // Prevent blur
                >
                  ✕
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-2 w-[200px]">
              <span className="font-medium text-slate-800" title={route.name}>
                {route.name.length > 50 ? `${route.name.slice(0, 50)}...` : route.name}
              </span>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600 text-xs px-1.5 py-0.5 rounded hover:bg-slate-100"
                title="Edit route name"
              >
                ✏️
              </button>
            </div>
          )}
          {error && (
            <p className="absolute top-full left-0 mt-1 text-xs text-red-600 whitespace-nowrap">
              {error}
            </p>
          )}
        </div>
      </TD>
      <TD>
        <RouteAssignmentForm
          routeId={route._id}
          assignedStaffId={assignedStaff?._id}
          staff={staff}
          assignStaffToRoute={assignStaffToRoute}
        />
      </TD>
      <TD>
        <Button
          variant="ghost"
          className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleDelete}
        >
          Delete
        </Button>
      </TD>
    </TR>
  );
}
