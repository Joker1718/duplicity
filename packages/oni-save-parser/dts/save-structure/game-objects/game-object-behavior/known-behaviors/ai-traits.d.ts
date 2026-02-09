import { GameObjectBehavior } from "../game-object-behavior";
import { BehaviorName } from "./types";
export declare const DupeTraitsBehavior: BehaviorName<DupeTraitsBehavior>;
export interface DupeTraitsBehavior extends GameObjectBehavior {
    name: "Klei.AI.Traits";
    templateData: {
        TraitIds: string[];
    };
}
/** @deprecated Use DupeTraitsBehavior instead. */
export declare const AITraitsBehavior: BehaviorName<DupeTraitsBehavior>;
/** @deprecated Use DupeTraitsBehavior instead. */
export type AITraitsBehavior = DupeTraitsBehavior;
export type TraitStatus = "positive" | "negative" | "universal" | "overjoyed" | "stress";
export interface TraitDefinition {
    id: string;
    traits: string;
    desc: string;
    status: TraitStatus;
}
export declare const DUPE_TRAITS: TraitDefinition[];
export declare const BIONIC_TRAITS: TraitDefinition[];
export declare const DUPE_TRAIT_IDS: string[];
export declare const BIONIC_TRAIT_IDS: string[];
export declare const DUPE_OVERJOYED_REACTION_IDS: string[];
export declare const DUPE_STRESS_REACTION_IDS: string[];
export declare const BIONIC_OVERJOYED_REACTION_IDS: string[];
export declare const BIONIC_STRESS_REACTION_IDS: string[];
/** @deprecated Use DUPE_TRAIT_IDS instead. */
export declare const AI_TRAIT_IDS: string[];
