import React, { useState } from 'react';
import streamData from '../../../library/livestreams/yt_stream_list.json';
import './Study_room.css';

interface StreamInfo {
  id: string;
  title: string;
  videoId: string;
  sourceName?: string;
  sourceUrl?: string;
}

const LiveStudy: React.FC = () => {
  const streams = streamData as StreamInfo[];
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  if (!streams || streams.length === 0) {
    return (
      <div className="live-study">
        <div className="live-study-empty">
          No livestreams configured. Add streams to library/livestreams/yt_stream_list.json
        </div>
      </div>
    );
  }

  const stream = streams[selectedIndex];
  const embedUrl = `https://www.youtube.com/embed/${stream.videoId}?autoplay=0&rel=0`;

  return (
    <div className="live-study">
      <div className="live-study-header">
        {streams.length > 1 && (
          <select 
            className="live-study-selector"
            value={selectedIndex}
            onChange={(e) => setSelectedIndex(Number(e.target.value))}
          >
            {streams.map((s, idx) => (
              <option key={s.id} value={idx}>
                {s.title}
              </option>
            ))}
          </select>
        )}
        <div className="live-study-meta">
          <h3 className="live-study-title">{stream.title || 'Live Study Stream'}</h3>
          {stream.sourceName && (
            <div className="live-study-source">
              Source:{" "}
              {stream.sourceUrl ? (
                <a href={stream.sourceUrl} target="_blank" rel="noreferrer">
                  {stream.sourceName}
                </a>
              ) : (
                stream.sourceName
              )}
            </div>
          )}
        </div>
      </div>

      <div className="live-study-player">
        <iframe
          src={embedUrl}
          title={stream.title || 'Live Study'}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </div>
  );
};

export default LiveStudy;
