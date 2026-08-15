const db = require('../config/db');

exports.list = async (req, res, next) => {
  try {
    const column = req.user.role === 'agent' ? 'agent_id' : 'owner_id';
    const result = await db.query(
      `SELECT * FROM notifications WHERE ${column} = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    await db.query('UPDATE notifications SET read = true WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
