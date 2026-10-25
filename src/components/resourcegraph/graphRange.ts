/**
 * Graph range config is shared with the server so the client's history channel
 * keys always match what `parseResourceChannel` expects.
 */
export {
  GRAPH_RANGES,
  DEFAULT_GRAPH_RANGE,
  MAX_SERVER_POINTS,
  MAX_PLOT_POINTS,
  downsample,
} from '../../../server/common/graph';
export type { GraphRange, GraphRangeKey } from '../../../server/common/graph';