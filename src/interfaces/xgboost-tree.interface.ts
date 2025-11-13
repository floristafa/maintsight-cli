export interface XGBoostTree {
  base_weights: number[];
  categories: any[];
  categories_nodes: number[];
  categories_segments: number[];
  categories_sizes: number[];
  default_left: number[];
  id: number;
  left_children: number[];
  loss_changes: number[];
  parents: number[];
  right_children: number[];
  split_conditions: number[];
  split_indices: number[];
  split_type: number[];
  sum_hessian: number[];
  tree_param: any;
}
