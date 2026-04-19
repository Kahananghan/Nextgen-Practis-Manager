import React, { useState, useEffect } from 'react';
import { ExternalLink, Check, AlertCircle, RefreshCw, Users, BarChart3, Settings, Trash2, ChevronDown } from 'lucide-react';
import { xeroService } from '../../services/xeroService';

interface XeroIntegrationProps {
  onRefresh?: () => void;
}

const XeroIntegration: React.FC<XeroIntegrationProps> = ({ onRefresh }) => {
  const [connectionStatus, setConnectionStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState<'full' | 'delta' | null>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showManageMenu, setShowManageMenu] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    fetchConnectionStatus();
    fetchSyncStatus();
  }, []);

  const fetchConnectionStatus = async () => {
    try {
      const status = await xeroService.getStatus();
      setConnectionStatus(status.data);
    } catch (error) {
      console.error('Failed to fetch Xero status:', error);
      setError('Failed to fetch connection status');
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const [status, stats] = await Promise.all([
        xeroService.getSyncStatus(),
        xeroService.getSyncStats()
      ]);
      setSyncStatus({ 
        history: status.data.history, 
        stats: status.data.stats,
        detailedStats: stats.data 
      });
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    
    try {
      const response = await xeroService.connect();
      const { consentUrl } = response.data;
      
      // Open OAuth popup
      const popup = window.open(
        consentUrl,
        'xero-oauth',
        'width=600,height=600,scrollbars=yes,resizable=yes'
      );

      // Poll for popup closure
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          setConnecting(false);
          fetchConnectionStatus();
          onRefresh?.();
        }
      }, 1000);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkClosed);
        popup?.close();
        setConnecting(false);
        setError('Connection timed out. Please try again.');
      }, 300000);

    } catch (error) {
      console.error('Failed to connect to Xero:', error);
      setError('Failed to initiate Xero connection');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect from Xero? This will stop all automatic syncing.')) {
      return;
    }

    try {
      await xeroService.disconnect();
      setConnectionStatus(null);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to disconnect from Xero:', error);
      setError('Failed to disconnect from Xero');
    }
  };

  const handleManageAction = (action: string) => {
    setShowManageMenu(false);
    switch (action) {
      case 'view-logs':
        setShowLogs(true);
        break;
      case 'refresh':
        fetchConnectionStatus();
        fetchSyncStatus();
        onRefresh?.();
        break;
      default:
        break;
    }
  };

  const handleSync = async (type: 'full' | 'delta') => {
    setSyncing(type);
    setError(null);

    try {
      const response = type === 'full' 
        ? await xeroService.triggerFullSync()
        : await xeroService.triggerDeltaSync();
      
      const jobId = response.data?.jobId;
      let pollCount = 0;
      const maxPolls = 300; // 10 minutes at 2s intervals
      
      // Poll for sync completion
      const pollInterval = setInterval(async () => {
        try {
          pollCount++;
          const status = await xeroService.getSyncStatus();
          const history = status.data?.history || [];
          
          // Find the sync log for our job (most recent if no jobId match)
          const latestSync = history[0];
          const syncStatus = latestSync?.status;
          
          console.log(`[Sync Poll ${pollCount}] Status:`, syncStatus, 'Records:', latestSync?.records_synced, 'History length:', history.length);
          
          // Stop conditions
          if (syncStatus === 'completed') {
            console.log('[Sync] Completed successfully');
            clearInterval(pollInterval);
            setSyncing(null);
            fetchSyncStatus();
            return;
          }
          
          if (syncStatus === 'failed') {
            console.log('[Sync] Failed:', latestSync?.error_message);
            clearInterval(pollInterval);
            setSyncing(null);
            setError(`Sync failed: ${latestSync?.error_message || 'Unknown error'}`);
            return;
          }
          
          // If no sync in progress and we've polled a few times, assume done
          if (!syncStatus && pollCount > 5) {
            console.log('[Sync] No active sync found, stopping poll');
            clearInterval(pollInterval);
            setSyncing(null);
            fetchSyncStatus();
            return;
          }
          
          // Stop after max polls
          if (pollCount >= maxPolls) {
            console.log('[Sync] Max polls reached, stopping');
            clearInterval(pollInterval);
            setSyncing(null);
            setError('Sync is taking longer than expected. Please check status later.');
          }
        } catch (error) {
          console.error('Failed to poll sync status:', error);
          // Stop polling on error after a few retries
          if (pollCount > 5) {
            clearInterval(pollInterval);
            setSyncing(null);
            setError('Failed to check sync status');
          }
        }
      }, 2000);

    } catch (error) {
      console.error('Failed to trigger sync:', error);
      setError(`Failed to trigger ${type} sync`);
      setSyncing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366f1]"></div>
      </div>
    );
  }

  const isConnected = connectionStatus?.connected;

  return (
    <div className="bg-white border border-slate-100 rounded-[32px] p-8 space-y-8 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center">
            <img 
              src="/assets/Xero-logo.png"
              alt="Xero" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800">Xero</h3>
            <div className="flex items-center gap-2 mt-1">
              {isConnected ? (
                <>
                  <div className="w-2 h-2 bg-[#1d9e75] rounded-full"></div>
                  <span className="text-xs font-medium text-green-600">Connected</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                  <span className="text-xs font-medium text-slate-400">Not Connected</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Manage Button */}
          <div className="relative">
            <button
              onClick={() => setShowManageMenu(!showManageMenu)}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-black text-slate-800 hover:text-[#6366f1] transition-colors uppercase tracking-widest bg-slate-50 hover:bg-slate-100 rounded-xl"
            >
              <Settings size={16} />
              Manage
              <ChevronDown size={14} className={`transition-transform ${showManageMenu ? 'rotate-180' : ''}`} />
            </button>

            {showManageMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowManageMenu(false)}
                />
                <div className="absolute right-0 top-12 bg-white rounded-lg shadow-lg border border-slate-100 py-2 z-20 min-w-[180px]">
                  <button
                    onClick={() => handleManageAction('view-logs')}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                  >
                    <BarChart3 size={14} className="text-slate-400" />
                    View Sync Logs
                  </button>
                  {/* <button
                    onClick={() => handleManageAction('configure')}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                  >
                    <Settings size={14} className="text-slate-400" />
                    Configure Settings
                  </button> */}
                  <button
                    onClick={() => handleManageAction('refresh')}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                  >
                    <RefreshCw size={14} className="text-slate-400" />
                    Refresh Status
                  </button>
                  {isConnected && (
                    <>
                      <div className="border-t border-slate-100 my-2"></div>
                      <button
                        onClick={handleDisconnect}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-3"
                      >
                        <Trash2 size={14} />
                        Disconnect
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Disconnect Button (only show when connected and menu is closed) */}
          {isConnected && !showManageMenu && (
            <button
              onClick={handleDisconnect}
              className="p-2.5 rounded-lg hover:bg-red-50 text-[#e05252] transition-colors"
              title="Disconnect"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm font-medium text-slate-400 leading-relaxed">
        Streamline your finances with seamless accounting powered by Xero integration. 
        Sync clients, jobs, and tasks automatically.
      </p>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2">
          <AlertCircle size={16} className="text-[#e05252] mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-medium text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Connection Actions */}
      <div className="flex items-center gap-3">
        {!isConnected ? (
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="px-6 py-2.5 bg-[#6366f1] text-white text-xs font-black rounded-xl hover:bg-[#4f52d4] transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-2"
          >
            {connecting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Connecting...
              </>
            ) : (
              <>
                <ExternalLink size={16} />
                Connect
              </>
            )}
          </button>
        ) : (
          <>
            <button
              onClick={() => handleSync('delta')}
              disabled={syncing !== null}
              className="px-4 py-2.5 bg-blue-500 text-white text-xs font-black rounded-xl hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
            >
              {syncing === 'delta' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  Quick Sync
                </>
              )}
            </button>

            <button
              onClick={() => handleSync('full')}
              disabled={syncing !== null}
              className="px-4 py-2.5 bg-slate-600 text-white text-xs font-black rounded-xl hover:bg-slate-700 transition-all shadow-xl shadow-slate-600/20 disabled:opacity-50 flex items-center gap-2"
            >
              {syncing === 'full' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Full Sync...
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  Full Sync
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* Sync Status */}
      {isConnected && syncStatus && showLogs && (
        <div className="space-y-6 pt-6 border-t border-slate-100">
          
          {/* Close Logs Button */}
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-600">Recent Sync Activity</h4>
            <button
              onClick={() => setShowLogs(false)}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Hide Logs
            </button>
          </div>

          {/* Recent Sync History */}
          {syncStatus.history && syncStatus.history.length > 0 && (
            <div className="space-y-2">
              {syncStatus.history.slice(0, 3).map((sync: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      sync.status === 'completed' ? 'bg-[#1d9e75]' :
                      sync.status === 'failed' ? 'bg-[#e05252]' :
                      'bg-yellow-500'
                    }`}></div>
                    <div>
                      <div className="text-xs font-medium text-slate-700">
                        {sync.sync_type === 'full' ? 'Full Sync' : 'Delta Sync'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(sync.started_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-slate-700">
                      {sync.records_synced || 0} records
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {sync.duration_ms ? `${(sync.duration_ms / 1000).toFixed(1)}s` : '-'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {!syncStatus.history?.length && (
            <p className="text-sm text-slate-400">No sync activity yet</p>
          )}
        </div>
      )}
    </div>
  );
};

export default XeroIntegration;
