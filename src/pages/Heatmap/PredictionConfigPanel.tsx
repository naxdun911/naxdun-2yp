import { useState } from 'react';
import { Settings, Save, RefreshCw, Info } from 'lucide-react';

interface PredictionConfigProps {
  onConfigChange?: (config: PredictionConfig) => void;
  isOpen?: boolean;
  onToggle?: () => void;
}

interface PredictionConfig {
  alpha: number;
  beta: number;
  forecastSteps: number;
  autoTune: boolean;
  minDataPoints: number;
  confidenceThreshold: {
    high: number;
    medium: number;
  };
}

const DEFAULT_CONFIG: PredictionConfig = {
  alpha: 0.3,
  beta: 0.3,
  forecastSteps: 1,
  autoTune: true,
  minDataPoints: 5,
  confidenceThreshold: {
    high: 20, // MAPE < 20% = high confidence
    medium: 40 // MAPE < 40% = medium confidence
  }
};

const PredictionConfigPanel = ({ onConfigChange, isOpen = false, onToggle }: PredictionConfigProps) => {
  const [config, setConfig] = useState<PredictionConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfigUpdate = (field: keyof PredictionConfig, value: any) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  const handleNestedConfigUpdate = (parent: string, field: string, value: any) => {
    const newConfig = {
      ...config,
      [parent]: {
        ...(config as any)[parent],
        [field]: value
      }
    };
    setConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    onConfigChange?.(DEFAULT_CONFIG);
  };

  const handleOptimize = async () => {
    setIsLoading(true);
    // Simulate optimization process
    setTimeout(() => {
      const optimizedConfig = {
        ...config,
        alpha: 0.4,
        beta: 0.2,
        autoTune: true
      };
      setConfig(optimizedConfig);
      onConfigChange?.(optimizedConfig);
      setIsLoading(false);
    }, 2000);
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
        title="Prediction Settings"
      >
        <Settings className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-xl shadow-xl border border-gray-200 p-6 w-96 z-50 max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Prediction Settings
        </h3>
        <button
          onClick={onToggle}
          className="text-gray-500 hover:text-gray-700 p-1"
        >
          ×
        </button>
      </div>

      <div className="space-y-4">
        {/* Auto-tune toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Auto-tune Parameters</label>
          <input
            type="checkbox"
            checked={config.autoTune}
            onChange={(e) => handleConfigUpdate('autoTune', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>

        {/* Alpha parameter */}
        <div className={config.autoTune ? 'opacity-50' : ''}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Alpha (Level Smoothing): {config.alpha}
          </label>
          <input
            type="range"
            min="0.1"
            max="0.9"
            step="0.1"
            value={config.alpha}
            onChange={(e) => handleConfigUpdate('alpha', parseFloat(e.target.value))}
            disabled={config.autoTune}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="text-xs text-gray-500 mt-1">
            Higher values respond faster to changes
          </div>
        </div>

        {/* Beta parameter */}
        <div className={config.autoTune ? 'opacity-50' : ''}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Beta (Trend Smoothing): {config.beta}
          </label>
          <input
            type="range"
            min="0.1"
            max="0.9"
            step="0.1"
            value={config.beta}
            onChange={(e) => handleConfigUpdate('beta', parseFloat(e.target.value))}
            disabled={config.autoTune}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="text-xs text-gray-500 mt-1">
            Higher values adapt trend faster
          </div>
        </div>

        {/* Forecast steps */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Forecast Steps: {config.forecastSteps}
          </label>
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={config.forecastSteps}
            onChange={(e) => handleConfigUpdate('forecastSteps', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="text-xs text-gray-500 mt-1">
            Number of time periods to predict ahead
          </div>
        </div>

        {/* Minimum data points */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Min Data Points: {config.minDataPoints}
          </label>
          <input
            type="range"
            min="3"
            max="20"
            step="1"
            value={config.minDataPoints}
            onChange={(e) => handleConfigUpdate('minDataPoints', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="text-xs text-gray-500 mt-1">
            Minimum historical data required for prediction
          </div>
        </div>

        {/* Confidence thresholds */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Confidence Thresholds (MAPE %)</label>
          
          <div>
            <label className="block text-xs text-gray-600 mb-1">
              High Confidence (&lt; {config.confidenceThreshold.high}%)
            </label>
            <input
              type="range"
              min="10"
              max="30"
              step="5"
              value={config.confidenceThreshold.high}
              onChange={(e) => handleNestedConfigUpdate('confidenceThreshold', 'high', parseInt(e.target.value))}
              className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          
          <div>
            <label className="block text-xs text-gray-600 mb-1">
              Medium Confidence (&lt; {config.confidenceThreshold.medium}%)
            </label>
            <input
              type="range"
              min="30"
              max="60"
              step="5"
              value={config.confidenceThreshold.medium}
              onChange={(e) => handleNestedConfigUpdate('confidenceThreshold', 'medium', parseInt(e.target.value))}
              className="w-full h-2 bg-yellow-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-4 border-t border-gray-200">
          <button
            onClick={handleOptimize}
            disabled={isLoading}
            className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            {isLoading ? 'Optimizing...' : 'Auto-Optimize'}
          </button>
          
          <button
            onClick={handleReset}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Reset
          </button>
        </div>

        {/* Info section */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-start">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-xs text-blue-800">
              <div className="font-medium mb-1">Holt's Linear Trend Method</div>
              <div>
                Uses level and trend smoothing to predict future values based on historical patterns.
                Auto-tune finds optimal parameters automatically.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionConfigPanel;