import clientPromise, { ObjectId } from '../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { key, hwid, projectId } = req.body;

    if (!key || !hwid || !projectId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Key, HWID e projectId são obrigatórios' 
      });
    }

    const client = await clientPromise;
    const db = client.db('authguard');

    const keyDoc = await db.collection('keys').findOne({ 
      key,
      projectId: new ObjectId(projectId)
    });

    if (!keyDoc) {
      await db.collection('logs').insertOne({
        projectId: new ObjectId(projectId),
        keyId: null,
        key,
        hwid,
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        action: 'failed',
        timestamp: new Date()
      });

      return res.status(404).json({ 
        success: false, 
        error: 'Key não encontrada' 
      });
    }

    if (keyDoc.status === 'banned') {
      await db.collection('logs').insertOne({
        projectId: new ObjectId(projectId),
        keyId: keyDoc._id,
        key,
        hwid,
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        action: 'banned',
        timestamp: new Date()
      });

      return res.status(403).json({ 
        success: false, 
        error: 'Key foi banida' 
      });
    }

    if (keyDoc.expiresAt && new Date() > new Date(keyDoc.expiresAt)) {
      await db.collection('keys').updateOne(
        { _id: keyDoc._id },
        { $set: { status: 'expired' } }
      );

      await db.collection('logs').insertOne({
        projectId: new ObjectId(projectId),
        keyId: keyDoc._id,
        key,
        hwid,
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        action: 'expired',
        timestamp: new Date()
      });

      return res.status(403).json({ 
        success: false, 
        error: 'Key expirou' 
      });
    }

    if (keyDoc.hwid === null) {
      await db.collection('keys').updateOne(
        { _id: keyDoc._id },
        { 
          $set: { 
            hwid,
            lastUsed: new Date()
          },
          $inc: { usageCount: 1 }
        }
      );
    } else if (keyDoc.hwid !== hwid) {
      await db.collection('logs').insertOne({
        projectId: new ObjectId(projectId),
        keyId: keyDoc._id,
        key,
        hwid,
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        action: 'hwid_mismatch',
        timestamp: new Date()
      });

      return res.status(403).json({ 
        success: false, 
        error: 'HWID não corresponde' 
      });
    } else {
      await db.collection('keys').updateOne(
        { _id: keyDoc._id },
        { 
          $set: { lastUsed: new Date() },
          $inc: { usageCount: 1 }
        }
      );
    }

    await db.collection('logs').insertOne({
      projectId: new ObjectId(projectId),
      keyId: keyDoc._id,
      key,
      hwid,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      action: 'validated',
      timestamp: new Date()
    });

    await db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      { $inc: { 'stats.totalValidations': 1 } }
    );

    res.status(200).json({
      success: true,
      message: 'Key válida',
      expiresAt: keyDoc.expiresAt
    });
  } catch (error) {
    console.error('Erro ao validar key:', error);
    res.status(500).json({ success: false, error: 'Erro ao validar key' });
  }
}
