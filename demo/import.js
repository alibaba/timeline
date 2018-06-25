const G = typeof window !== 'undefined' ? window : self;

import Timeline from '../src/index'

G.Timeline = Timeline;
G.ShadowTimeline = Timeline.ShadowTimeline;
