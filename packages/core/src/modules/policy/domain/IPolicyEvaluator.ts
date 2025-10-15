import { Result } from '../../../shared/core/Result';

/**
 * Context for policy evaluation
 */
export interface PolicyContext {
  userId: string;
  roles: string[];
  permissions: string[];
  resource?: string;
  action?: string;
  attributes?: Record<string, unknown>;
}

/**
 * Policy evaluation result
 */
export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
  matchedPolicies?: string[];
}

/**
 * Policy evaluator interface
 * Supports both RBAC (Role-Based Access Control) and ABAC (Attribute-Based Access Control)
 */
export interface IPolicyEvaluator {
  /**
   * Evaluate if the given context is allowed to perform an action
   */
  evaluate(context: PolicyContext): Promise<Result<PolicyDecision, string>>;

  /**
   * Check if user has a specific permission
   */
  hasPermission(userId: string, permission: string): Promise<boolean>;

  /**
   * Check if user has a specific role
   */
  hasRole(userId: string, role: string): Promise<boolean>;

  /**
   * Check if user can perform an action on a resource
   */
  canAccessResource(
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean>;
}
