/**
 * Example: Policy Evaluation (RBAC)
 *
 * Demonstrates how to evaluate permissions using the Policy module.
 */

import { RBACPolicyEvaluator } from '@excore/core/policy';
import { Result } from '@excore/core/shared';

// Example: Policy Evaluation Scenarios
async function policyEvaluationExample() {
  console.log('=== Policy Evaluation Example ===\n');

  const evaluator = new RBACPolicyEvaluator();

  // Example 1: Admin with wildcard permissions
  console.log('1️⃣ Admin User - Wildcard Permissions:');
  const adminDecision = await evaluator.evaluate({
    userId: 'user-1',
    roles: ['admin'],
    permissions: ['*'], // Wildcard - all permissions
    resource: 'articles',
    action: 'delete',
  });

  if (adminDecision.isSuccess) {
    console.log(`✅ Permission ${adminDecision.value.allowed ? 'GRANTED' : 'DENIED'}`);
    console.log('Reason:', adminDecision.value.reason);
  }

  // Example 2: Editor with specific permissions
  console.log('\n2️⃣ Editor User - Specific Permissions:');
  const editorDecision = await evaluator.evaluate({
    userId: 'user-2',
    roles: ['editor'],
    permissions: [
      'articles:read',
      'articles:write',
      'articles:update',
      'articles:publish',
    ],
    resource: 'articles',
    action: 'publish',
  });

  if (editorDecision.isSuccess) {
    console.log(`✅ Permission ${editorDecision.value.allowed ? 'GRANTED' : 'DENIED'}`);
    console.log('Reason:', editorDecision.value.reason);
  }

  // Example 3: Author trying to delete (no permission)
  console.log('\n3️⃣ Author User - Insufficient Permissions:');
  const authorDecision = await evaluator.evaluate({
    userId: 'user-3',
    roles: ['author'],
    permissions: ['articles:read', 'articles:write'],
    resource: 'articles',
    action: 'delete',
  });

  if (authorDecision.isSuccess) {
    console.log(`❌ Permission ${authorDecision.value.allowed ? 'GRANTED' : 'DENIED'}`);
    console.log('Reason:', authorDecision.value.reason);
  }

  // Example 4: Resource wildcard permissions
  console.log('\n4️⃣ User with Resource Wildcard:');
  const wildcardDecision = await evaluator.evaluate({
    userId: 'user-4',
    roles: ['content-manager'],
    permissions: ['articles:*'], // All article operations
    resource: 'articles',
    action: 'archive',
  });

  if (wildcardDecision.isSuccess) {
    console.log(`✅ Permission ${wildcardDecision.value.allowed ? 'GRANTED' : 'DENIED'}`);
    console.log('Reason:', wildcardDecision.value.reason);
  }

  // Example 5: Multiple roles evaluation
  console.log('\n5️⃣ User with Multiple Roles:');
  const multiRoleDecision = await evaluator.evaluate({
    userId: 'user-5',
    roles: ['author', 'moderator'], // Multiple roles
    permissions: [
      'articles:read',
      'articles:write',
      'comments:moderate',
      'comments:delete',
    ],
    resource: 'comments',
    action: 'moderate',
  });

  if (multiRoleDecision.isSuccess) {
    console.log(`✅ Permission ${multiRoleDecision.value.allowed ? 'GRANTED' : 'DENIED'}`);
    console.log('Reason:', multiRoleDecision.value.reason);
  }

  // Example 6: Viewer with read-only access
  console.log('\n6️⃣ Viewer User - Read-Only Access:');
  const viewerReadDecision = await evaluator.evaluate({
    userId: 'user-6',
    roles: ['viewer'],
    permissions: ['articles:read', 'comments:read'],
    resource: 'articles',
    action: 'read',
  });

  if (viewerReadDecision.isSuccess) {
    console.log(`✅ Permission ${viewerReadDecision.value.allowed ? 'GRANTED' : 'DENIED'}`);
    console.log('Reason:', viewerReadDecision.value.reason);
  }

  const viewerWriteDecision = await evaluator.evaluate({
    userId: 'user-6',
    roles: ['viewer'],
    permissions: ['articles:read', 'comments:read'],
    resource: 'articles',
    action: 'write',
  });

  if (viewerWriteDecision.isSuccess) {
    console.log(`❌ Permission ${viewerWriteDecision.value.allowed ? 'GRANTED' : 'DENIED'}`);
    console.log('Reason:', viewerWriteDecision.value.reason);
  }

  // Example 7: Superadmin bypass
  console.log('\n7️⃣ Superadmin User - Full Access:');
  const superadminDecision = await evaluator.evaluate({
    userId: 'user-7',
    roles: ['superadmin'],
    permissions: [], // Even with no explicit permissions
    resource: 'system',
    action: 'configure',
  });

  if (superadminDecision.isSuccess) {
    console.log(`✅ Permission ${superadminDecision.value.allowed ? 'GRANTED' : 'DENIED'}`);
    console.log('Reason:', superadminDecision.value.reason);
  }

  // Example 8: Complex permission scenarios
  console.log('\n8️⃣ Complex Permission Scenarios:');

  const scenarios = [
    {
      name: 'User Management',
      context: {
        userId: 'admin-1',
        roles: ['admin'],
        permissions: ['users:*'],
        resource: 'users',
        action: 'ban',
      },
    },
    {
      name: 'Settings Access',
      context: {
        userId: 'user-8',
        roles: ['user'],
        permissions: ['profile:update'],
        resource: 'settings',
        action: 'update',
      },
    },
    {
      name: 'Report Generation',
      context: {
        userId: 'analyst-1',
        roles: ['analyst'],
        permissions: ['reports:generate', 'reports:export'],
        resource: 'reports',
        action: 'generate',
      },
    },
  ];

  for (const scenario of scenarios) {
    const decision = await evaluator.evaluate(scenario.context);
    if (decision.isSuccess) {
      console.log(`\n${scenario.name}:`);
      console.log(`  ${decision.value.allowed ? '✅ GRANTED' : '❌ DENIED'}`);
      console.log(`  Reason: ${decision.value.reason}`);
    }
  }

  // Example 9: Permission matrix
  console.log('\n9️⃣ Permission Matrix:');
  console.log('\n┌─────────────┬──────────┬──────────┬──────────┬──────────┐');
  console.log('│ Role        │ Read     │ Write    │ Update   │ Delete   │');
  console.log('├─────────────┼──────────┼──────────┼──────────┼──────────┤');

  const roles = [
    {
      name: 'Admin',
      permissions: ['articles:*'],
    },
    {
      name: 'Editor',
      permissions: ['articles:read', 'articles:write', 'articles:update'],
    },
    {
      name: 'Author',
      permissions: ['articles:read', 'articles:write'],
    },
    {
      name: 'Viewer',
      permissions: ['articles:read'],
    },
  ];

  for (const role of roles) {
    const actions = ['read', 'write', 'update', 'delete'];
    const results = [];

    for (const action of actions) {
      const decision = await evaluator.evaluate({
        userId: 'test-user',
        roles: [role.name.toLowerCase()],
        permissions: role.permissions,
        resource: 'articles',
        action: action,
      });

      results.push(decision.isSuccess && decision.value.allowed ? '✅' : '❌');
    }

    console.log(
      `│ ${role.name.padEnd(11)} │ ${results[0].padEnd(8)} │ ${results[1].padEnd(8)} │ ${results[2].padEnd(8)} │ ${results[3].padEnd(8)} │`
    );
  }

  console.log('└─────────────┴──────────┴──────────┴──────────┴──────────┘');
}

// Run the example
policyEvaluationExample()
  .then(() => {
    console.log('\n✨ Policy Evaluation examples completed!');
  })
  .catch((error) => {
    console.error('❌ Example failed:', error);
  });
