export type BrickCategory =
  | 'brick'
  | 'plate'
  | 'slope'
  | 'round'
  | 'window'
  | 'door'
  | 'decorative'
  | 'figure'
  | 'connector'
  | 'specialty';

export interface BrickDefinition {
  code: string;
  name: string;
  category: BrickCategory;
  width: number;
  height: number;
  image: string;
}
