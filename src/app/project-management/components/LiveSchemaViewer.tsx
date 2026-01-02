'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Database, Table, RefreshCw, Columns, X, GripVertical } from 'lucide-react';

interface SchemaData {
  columns: string[];
  types: Record<string, string>;
}

interface LiveSchemaViewerProps {
  projectId: string;
  tablePrefix?: string;
  isParent?: boolean;
}

// Format SQL types to be more readable
function formatType(type: string | undefined): string {
  if (!type) return '';
  return type
    .replace('character varying', 'varchar')
    .replace('timestamp with time zone', 'timestamptz')
    .replace('timestamp without time zone', 'timestamp')
    .replace('double precision', 'double')
    .replace('boolean', 'bool')
    .replace('integer', 'int')
    .replace('uuid', 'uuid');
}

// Custom hook for draggable functionality
function useDraggable(initialPosition: { x: number; y: number }) {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      dragOffset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y
      };
      e.preventDefault();
    }
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return { position, isDragging, handleMouseDown };
}

// Level 2: Columns Popup - shows all columns for a table
function ColumnsPopup({ tableName, schema, tablePrefix, onSelectColumn, selectedColumn, onClose }: {
  tableName: string;
  schema: SchemaData;
  tablePrefix: string;
  onSelectColumn: (col: string, type: string) => void;
  selectedColumn: string | null;
  onClose: () => void;
}) {
  const { position, isDragging, handleMouseDown } = useDraggable({ x: 500, y: 120 });
  const columns = schema.columns || [];
  const types = schema.types || {};
  const displayName = tableName.replace(`${tablePrefix}_`, '');

  return (
    <div
      className="fixed w-80 bg-gray-800 border border-purple-500/50 rounded-lg shadow-2xl z-50"
      style={{
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="drag-handle flex items-center justify-between px-3 py-2 border-b border-gray-700 bg-gray-900 cursor-grab active:cursor-grabbing rounded-t-lg">
        <div className="flex items-center gap-2">
          <GripVertical className="w-3 h-3 text-gray-500" />
          <Table className="w-4 h-4 text-purple-400" />
          <span className="text-purple-300 font-mono text-sm">{displayName}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="text-gray-400 hover:text-white hover:bg-gray-600 rounded p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-2 max-h-[60vh] overflow-auto space-y-0.5">
        {columns.map((col) => (
          <button
            key={col}
            onClick={() => onSelectColumn(col, types[col])}
            className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-left text-xs ${
              selectedColumn === col ? 'bg-purple-600' : 'hover:bg-gray-700'
            }`}
          >
            <span className="text-gray-200 font-mono">{col}</span>
            <span className="text-purple-400 font-mono text-[11px]">
              {formatType(types[col])}
            </span>
          </button>
        ))}
      </div>

      <div className="px-3 py-2 border-t border-gray-700 bg-gray-900 text-xs text-gray-500 rounded-b-lg flex items-center justify-between">
        <span>{columns.length} columns</span>
        <span className="text-gray-600">Drag to move</span>
      </div>
    </div>
  );
}

// Level 3: Column Details Popup - shows details about a specific column
function ColumnDetailsPopup({ columnName, columnType, tableName, onClose }: {
  columnName: string;
  columnType: string;
  tableName: string;
  onClose: () => void;
}) {
  const { position, isDragging, handleMouseDown } = useDraggable({ x: 820, y: 120 });

  // Parse type details
  const isNullable = !columnType.includes('NOT NULL');
  const isPrimaryKey = columnName === 'id' || columnName.endsWith('_id');
  const isForeignKey = columnName.endsWith('_id') && columnName !== 'id';
  const isTimestamp = columnType.includes('timestamp');
  const hasDefault = columnType.includes('DEFAULT') || columnName === 'id' || columnName === 'created_at';

  return (
    <div
      className="fixed w-72 bg-gray-800 border border-blue-500/50 rounded-lg shadow-2xl z-[60]"
      style={{
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="drag-handle flex items-center justify-between px-3 py-2 border-b border-gray-700 bg-gray-900 cursor-grab active:cursor-grabbing rounded-t-lg">
        <div className="flex items-center gap-2">
          <GripVertical className="w-3 h-3 text-gray-500" />
          <Columns className="w-4 h-4 text-blue-400" />
          <span className="text-blue-300 font-mono text-sm">{columnName}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="text-gray-400 hover:text-white hover:bg-gray-600 rounded p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Type */}
        <div>
          <div className="text-gray-500 text-[10px] uppercase mb-1">Data Type</div>
          <div className="text-blue-400 font-mono text-sm bg-gray-900 px-2 py-1 rounded">
            {formatType(columnType)}
          </div>
        </div>

        {/* Table Reference */}
        <div>
          <div className="text-gray-500 text-[10px] uppercase mb-1">Table</div>
          <div className="text-purple-400 font-mono text-xs">{tableName}</div>
        </div>

        {/* Properties */}
        <div>
          <div className="text-gray-500 text-[10px] uppercase mb-1">Properties</div>
          <div className="flex flex-wrap gap-1">
            {isPrimaryKey && !isForeignKey && (
              <span className="px-2 py-0.5 bg-yellow-600/20 text-yellow-400 text-[10px] rounded">PRIMARY KEY</span>
            )}
            {isForeignKey && (
              <span className="px-2 py-0.5 bg-green-600/20 text-green-400 text-[10px] rounded">FOREIGN KEY</span>
            )}
            {isTimestamp && (
              <span className="px-2 py-0.5 bg-purple-600/20 text-purple-400 text-[10px] rounded">TIMESTAMP</span>
            )}
            {hasDefault && (
              <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-[10px] rounded">HAS DEFAULT</span>
            )}
            {isNullable && (
              <span className="px-2 py-0.5 bg-gray-600/20 text-gray-400 text-[10px] rounded">NULLABLE</span>
            )}
          </div>
        </div>

        {/* Usage hint */}
        {isForeignKey && (
          <div className="text-[10px] text-gray-500 border-t border-gray-700 pt-2">
            References: <span className="text-green-400">{columnName.replace('_id', '')}s</span> table
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-gray-700 bg-gray-900 text-xs text-gray-600 rounded-b-lg">
        Drag to move
      </div>
    </div>
  );
}

export function LiveSchemaViewer({ projectId, tablePrefix, isParent }: LiveSchemaViewerProps) {
  const [schema, setSchema] = useState<Record<string, SchemaData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Popup state
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [columnsPopupOpen, setColumnsPopupOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [selectedColumnType, setSelectedColumnType] = useState<string>('');
  const [detailsPopupOpen, setDetailsPopupOpen] = useState(false);

  // Fetch schema on mount
  useEffect(() => {
    fetchSchema();
  }, [projectId]);

  const fetchSchema = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/project-management/api/refresh-schema?projectId=${projectId}`);
      const data = await res.json();
      if (data.success) {
        setSchema(data.schema || {});
        setLastRefresh(new Date());
      } else {
        setError(data.error || 'Failed to load schema');
      }
    } catch (err) {
      setError('Failed to connect');
    } finally {
      setIsLoading(false);
    }
  };

  const rescanSchema = async () => {
    if (!tablePrefix) {
      setError('No table prefix configured for this project');
      return;
    }

    setIsRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/project-management/api/refresh-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, tablePrefix })
      });
      const data = await res.json();
      if (data.success) {
        await fetchSchema();
      } else {
        setError(data.error || 'Refresh failed');
      }
    } catch (err) {
      setError('Refresh failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTableClick = (tableName: string) => {
    setSelectedTable(tableName);
    setColumnsPopupOpen(true);
    // Close details popup when selecting new table
    setDetailsPopupOpen(false);
    setSelectedColumn(null);
  };

  const handleColumnClick = (col: string, type: string) => {
    setSelectedColumn(col);
    setSelectedColumnType(type);
    setDetailsPopupOpen(true);
  };

  const tables = Object.entries(schema).sort((a, b) => a[0].localeCompare(b[0]));
  const tableCount = tables.length;

  // Only show for parent projects with table_prefix
  if (!isParent || !tablePrefix) {
    return null;
  }

  return (
    <>
      <div className="bg-gray-800/50 rounded-lg border border-purple-900/30 p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-purple-400 font-medium flex items-center gap-2">
            <Database className="w-4 h-4" />
            Live Database Schema
            <span className="text-gray-500 text-xs font-normal">({tablePrefix}_)</span>
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {tableCount} tables
            </span>
            <button
              onClick={fetchSchema}
              disabled={isLoading}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
              title="Refresh from cache"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={rescanSchema}
              disabled={isRefreshing}
              className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded flex items-center gap-1"
              title="Rescan database for schema changes"
            >
              <Database className={`w-3 h-3 ${isRefreshing ? 'animate-pulse' : ''}`} />
              {isRefreshing ? 'Scanning...' : 'Rescan DB'}
            </button>
          </div>
        </div>

        {error && (
          <div className="text-red-400 text-xs mb-2 p-2 bg-red-900/20 rounded">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 text-purple-400 animate-spin" />
          </div>
        ) : tableCount === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No schema loaded</p>
            <p className="text-xs mt-1">Click "Rescan DB" to load tables</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {tables.map(([tableName, tableSchema]) => (
              <button
                key={tableName}
                onClick={() => handleTableClick(tableName)}
                className={`flex items-center gap-2 px-3 py-2 rounded border text-left transition-colors ${
                  selectedTable === tableName
                    ? 'bg-purple-600 border-purple-500 text-white'
                    : 'bg-gray-800 border-gray-700 hover:bg-gray-700 hover:border-purple-500/50'
                }`}
              >
                <Table className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-white font-mono text-xs truncate">
                    {tableName.replace(`${tablePrefix}_`, '')}
                  </div>
                  <div className="text-gray-500 text-[10px]">
                    {tableSchema.columns.length} cols
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {lastRefresh && (
          <div className="text-center text-[10px] text-gray-600 mt-3">
            Last refresh: {lastRefresh.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Level 2: Columns Popup */}
      {columnsPopupOpen && selectedTable && schema[selectedTable] && (
        <ColumnsPopup
          tableName={selectedTable}
          schema={schema[selectedTable]}
          tablePrefix={tablePrefix}
          onSelectColumn={handleColumnClick}
          selectedColumn={selectedColumn}
          onClose={() => {
            setColumnsPopupOpen(false);
            setSelectedTable(null);
            setDetailsPopupOpen(false);
            setSelectedColumn(null);
          }}
        />
      )}

      {/* Level 3: Column Details Popup */}
      {detailsPopupOpen && selectedColumn && selectedTable && (
        <ColumnDetailsPopup
          columnName={selectedColumn}
          columnType={selectedColumnType}
          tableName={selectedTable}
          onClose={() => {
            setDetailsPopupOpen(false);
            setSelectedColumn(null);
          }}
        />
      )}
    </>
  );
}
