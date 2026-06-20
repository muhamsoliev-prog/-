// In-memory database fallback for development
import bcryptjs from 'bcryptjs';

let users = [];

// Simple User model replacement for in-memory usage
export class InMemoryUser {
  constructor(data) {
    this._id = data._id || Math.random().toString(36).substr(2, 9);
    this.email = data.email;
    this.password = data.password;
    this.name = data.name || '';
    this.ipName = data.ipName || '';
    this.plan = data.plan || 'free';
    this.lastLogin = data.lastLogin || new Date();
  }

  async checkPassword(pwd) {
    return await bcryptjs.compare(pwd, this.password);
  }

  async save() {
    const idx = users.findIndex(u => u._id === this._id);
    if (idx >= 0) {
      users[idx] = this;
    } else {
      users.push(this);
    }
    return this;
  }

  toJSON() {
    return {
      _id: this._id,
      email: this.email,
      name: this.name,
      ipName: this.ipName,
      plan: this.plan,
      lastLogin: this.lastLogin,
    };
  }
}

export const findUserByEmail = (email) => {
  return users.find(u => u.email === email);
};

export const findUserById = (id) => {
  return users.find(u => u._id === id);
};

export const createUser = async (email, password, name) => {
  const hash = await bcryptjs.hash(password, 10);
  const user = new InMemoryUser({
    email,
    password: hash,
    name,
  });
  await user.save();
  return user;
};

export const getAllUsers = () => users;
export const clearUsers = () => { users = []; };
