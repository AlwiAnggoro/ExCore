/**
 * Example: Role Management
 *
 * Demonstrates how to create and manage roles with permissions.
 */

import { Role, CreateRoleUseCase } from '@excore/core/role';
import { Result } from '@excore/core/shared';

// Mock Role Repository
class MockRoleRepository {
  private roles: Map<string, any> = new Map();

  async save(role: any): Promise<Result<void, string>> {
    this.roles.set(role.id.toString(), role);
    console.log(`📝 Role saved: ${role.name}`);
    return Result.ok(undefined);
  }

  async findByName(name: string): Promise<any | null> {
    for (const role of this.roles.values()) {
      if (role.name === name) {
        return role;
      }
    }
    return null;
  }

  async existsByName(name: string): Promise<boolean> {
    return (await this.findByName(name)) !== null;
  }

  async findAll(): Promise<any[]> {
    return Array.from(this.roles.values());
  }

  getAll(): any[] {
    return Array.from(this.roles.values());
  }
}

// Example: Role Management Flow
async function roleManagementExample() {
  console.log('=== Role Management Example ===\n');

  const roleRepository = new MockRoleRepository();
  const createRoleUseCase = new CreateRoleUseCase(roleRepository);

  // Example 1: Create Admin Role
  console.log('1️⃣ Create Admin Role:');
  const adminResult = await createRoleUseCase.execute({
    name: 'admin',
    description: 'Full system access',
    permissions: [
      'users:*',      // All user operations
      'roles:*',      // All role operations
      'articles:*',   // All article operations
      'comments:*',   // All comment operations
      'settings:*',   // All settings operations
    ],
  });

  if (adminResult.isSuccess) {
    console.log('✅ Admin role created successfully!');
    console.log('Role ID:', adminResult.value.id);
    console.log('Permissions:', adminResult.value.permissions.join(', '));
  }

  // Example 2: Create Editor Role
  console.log('\n2️⃣ Create Editor Role:');
  const editorResult = await createRoleUseCase.execute({
    name: 'editor',
    description: 'Can manage articles and comments',
    permissions: [
      'articles:read',
      'articles:write',
      'articles:update',
      'articles:delete',
      'articles:publish',
      'comments:read',
      'comments:moderate',
    ],
  });

  if (editorResult.isSuccess) {
    console.log('✅ Editor role created successfully!');
    console.log('Permissions:', editorResult.value.permissions.join(', '));
  }

  // Example 3: Create Author Role
  console.log('\n3️⃣ Create Author Role:');
  const authorResult = await createRoleUseCase.execute({
    name: 'author',
    description: 'Can write and manage own articles',
    permissions: [
      'articles:read',
      'articles:write',
      'articles:update',
      'comments:read',
    ],
  });

  if (authorResult.isSuccess) {
    console.log('✅ Author role created successfully!');
    console.log('Permissions:', authorResult.value.permissions.join(', '));
  }

  // Example 4: Create Viewer Role
  console.log('\n4️⃣ Create Viewer Role:');
  const viewerResult = await createRoleUseCase.execute({
    name: 'viewer',
    description: 'Read-only access',
    permissions: [
      'articles:read',
      'comments:read',
    ],
  });

  if (viewerResult.isSuccess) {
    console.log('✅ Viewer role created successfully!');
    console.log('Permissions:', viewerResult.value.permissions.join(', '));
  }

  // Example 5: Invalid role - empty name
  console.log('\n5️⃣ Invalid Role - Empty Name:');
  const invalidResult1 = await createRoleUseCase.execute({
    name: '',
    description: 'Invalid role',
    permissions: ['test:read'],
  });

  if (invalidResult1.isFailure) {
    console.log('❌ Role creation failed:', invalidResult1.error);
  }

  // Example 6: Invalid role - duplicate name
  console.log('\n6️⃣ Invalid Role - Duplicate Name:');
  const invalidResult2 = await createRoleUseCase.execute({
    name: 'admin', // Already exists
    description: 'Another admin',
    permissions: ['test:read'],
  });

  if (invalidResult2.isFailure) {
    console.log('❌ Role creation failed:', invalidResult2.error);
  }

  // Example 7: Role with dynamic permissions
  console.log('\n7️⃣ Create Moderator Role with Dynamic Permissions:');
  const moderatorResult = await createRoleUseCase.execute({
    name: 'moderator',
    description: 'Can moderate content',
    permissions: [
      'comments:read',
      'comments:moderate',
      'comments:delete',
      'articles:flag',
      'users:suspend',
    ],
  });

  if (moderatorResult.isSuccess) {
    console.log('✅ Moderator role created successfully!');
    console.log('Permissions:', moderatorResult.value.permissions.join(', '));
  }

  // Example 8: Display all roles
  console.log('\n8️⃣ All Created Roles:');
  const allRoles = roleRepository.getAll();
  console.log(`\n📊 Total Roles: ${allRoles.length}\n`);

  allRoles.forEach((role, index) => {
    console.log(`${index + 1}. ${role.name.toUpperCase()}`);
    console.log(`   Description: ${role.description || 'N/A'}`);
    console.log(`   Permissions (${role.permissions.length}):`);
    role.permissions.forEach((perm: string) => {
      console.log(`     - ${perm}`);
    });
    console.log('');
  });

  // Example 9: Role comparison
  console.log('9️⃣ Role Permission Comparison:');
  const admin = allRoles.find((r) => r.name === 'admin');
  const editor = allRoles.find((r) => r.name === 'editor');
  const author = allRoles.find((r) => r.name === 'author');

  if (admin && editor && author) {
    console.log('Admin permissions:', admin.permissions.length);
    console.log('Editor permissions:', editor.permissions.length);
    console.log('Author permissions:', author.permissions.length);
    console.log('\nPermission hierarchy: Admin > Editor > Author');
  }
}

// Run the example
roleManagementExample()
  .then(() => {
    console.log('\n✨ Role Management examples completed!');
  })
  .catch((error) => {
    console.error('❌ Example failed:', error);
  });
