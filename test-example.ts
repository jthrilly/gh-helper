// Example test file to demonstrate improved analysis
export class UserService {
  private users: Map<string, User> = new Map();

  async createUser(userData: CreateUserRequest): Promise<User> {
    const user = {
      id: generateId(),
      email: userData.email,
      name: userData.name,
      createdAt: new Date(),
      isActive: true
    };

    this.users.set(user.id, user);
    return user;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }
}

interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  isActive: boolean;
}

interface CreateUserRequest {
  email: string;
  name: string;
}

function generateId(): string {
  return Math.random().toString(36).substring(2);
}