import clientPromise from '../../lib/db.js';
import bcrypt from 'bcryptjs';
import { generateToken } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Todos os campos são obrigatórios' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'Senha deve ter no mínimo 6 caracteres' 
      });
    }

    const client = await clientPromise;
    const db = client.db('authguard');

    const existingUser = await db.collection('users').findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username ou email já está em uso' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.collection('users').insertOne({
      username,
      email,
      password: hashedPassword,
      discordId: null,
      createdAt: new Date()
    });

    const token = generateToken({ 
      userId: result.insertedId.toString(),
      username,
      email
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: result.insertedId,
        username,
        email
      }
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ success: false, error: 'Erro ao criar usuário' });
  }
}
