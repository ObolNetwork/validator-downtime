import * as React from "react";
import { useState, useCallback } from "react";

interface CorrelationSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function CorrelationSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 0.1,
}: CorrelationSliderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(parseFloat(e.target.value));
    },
    [onChange]
  );

  // Calculate gradient position for visual feedback
  const percentage = ((value - min) / (max - min)) * 100;

  // Obol-themed color coding based on correlation level
  const getColor = (pct: number): string => {
    if (pct < 10) return "#2FE4AB"; // obol-green - minimal
    if (pct < 25) return "#27CAA1"; // obol-green-light
    if (pct < 50) return "#E89E30"; // obol-gold - moderate
    if (pct < 75) return "#DD603C"; // orange - significant
    return "#CC3333"; // red - severe
  };

  const currentColor = getColor(value);

  return (
    <div className="correlation-slider">
      <div className="slider-header">
        <label htmlFor="correlation-range">Network Offline Percentage</label>
        <span className="slider-value" style={{ color: currentColor }}>
          {value.toFixed(1)}%
        </span>
      </div>

      <div className="slider-container">
        <input
          type="range"
          id="correlation-range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          className={isDragging ? "dragging" : ""}
          style={
            {
              "--slider-progress": `${percentage}%`,
              "--slider-color": currentColor,
            } as React.CSSProperties
          }
          aria-label="Percentage of network validators offline simultaneously"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
        />
      </div>

      <div className="slider-labels">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>

      <p className="slider-description">
        {value < 1 ? (
          "Solo staker or fully independent infrastructure"
        ) : value < 10 ? (
          "Small operator with minimal correlation"
        ) : value < 25 ? (
          "Medium operator or shared infrastructure"
        ) : value < 50 ? (
          "Large operator with significant infrastructure overlap"
        ) : (
          "Major correlated failure event (cloud outage, client bug, etc.)"
        )}
      </p>

      <style>{`
        .correlation-slider {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
        }

        .slider-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .slider-header label {
          font-weight: 600;
          color: var(--text-primary, #DFEAED);
          font-size: 1.1rem;
        }

        .slider-value {
          font-size: 1.5rem;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          transition: color 0.2s ease;
        }

        .slider-container {
          position: relative;
          padding: 0.5rem 0;
        }

        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 8px;
          border-radius: 4px;
          background: linear-gradient(
            to right,
            var(--slider-color) 0%,
            var(--slider-color) var(--slider-progress),
            var(--bg-tertiary, #182D32) var(--slider-progress),
            var(--bg-tertiary, #182D32) 100%
          );
          cursor: pointer;
          transition: background 0.1s ease;
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--slider-color);
          border: 3px solid var(--bg-card, #1A292D);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          cursor: grab;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }

        input[type="range"].dragging::-webkit-slider-thumb {
          cursor: grabbing;
          transform: scale(1.15);
        }

        input[type="range"]::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--slider-color);
          border: 3px solid var(--bg-card, #1A292D);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          cursor: grab;
        }

        input[type="range"]:focus {
          outline: none;
        }

        input[type="range"]:focus::-webkit-slider-thumb {
          box-shadow: 0 0 0 4px rgba(47, 228, 171, 0.3);
        }

        .slider-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 0.5rem;
          font-size: 0.75rem;
          color: var(--text-muted, #667A80);
        }

        .slider-description {
          margin-top: 1rem;
          padding: 0.75rem 1rem;
          background: var(--bg-card, #1A292D);
          border-radius: 8px;
          font-size: 0.9rem;
          color: var(--text-secondary, #9DBFC8);
          text-align: center;
          border-left: 3px solid var(--slider-color, #2FE4AB);
        }
      `}</style>
    </div>
  );
}

export default CorrelationSlider;
