const mongoose = require('mongoose');
const User = require('../models/User');

const publicUserFields = 'name email role status createdAt updatedAt';

const getUsers = async (req, res) => {
    try {
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
        const search = String(req.query.search || '').trim();
        const filters = {};

        if (search) {
            const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filters.$or = [
                { name: { $regex: escapedSearch, $options: 'i' } },
                { email: { $regex: escapedSearch, $options: 'i' } }
            ];
        }

        if (req.query.role) {
            filters.role = req.query.role;
        }

        if (req.query.status) {
            filters.status = req.query.status;
        }

        const [users, total, statusSummary] = await Promise.all([
            User.find(filters)
                .select(publicUserFields)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            User.countDocuments(filters),
            User.aggregate([
                {
                    $group: {
                        _id: null,
                        active: {
                            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                        },
                        inactive: {
                            $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] }
                        },
                        admins: {
                            $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
                        },
                        total: { $sum: 1 }
                    }
                }
            ])
        ]);
        const summary = statusSummary[0] || {
            active: 0,
            inactive: 0,
            admins: 0,
            total: 0
        };

        return res.json({
            message: 'Users fetched successfully',
            data: users,
            summary: {
                total: summary.total,
                active: summary.active,
                inactive: summary.inactive,
                admins: summary.admins
            },
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit))
            }
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Error fetching users',
            error: error.message
        });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, status } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid user id' });
        }

        if (!role && !status) {
            return res.status(400).json({ message: 'Role or status is required' });
        }

        if (role && !['user', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Role must be user or admin' });
        }

        if (status && !['active', 'inactive'].includes(status)) {
            return res.status(400).json({ message: 'Status must be active or inactive' });
        }

        const isCurrentUser = String(req.user._id) === id;

        if (isCurrentUser && status === 'inactive') {
            return res.status(400).json({ message: 'You cannot deactivate your own account' });
        }

        if (isCurrentUser && role === 'user') {
            return res.status(400).json({ message: 'You cannot remove your own administrator role' });
        }

        const updates = {};

        if (role) {
            updates.role = role;
        }

        if (status) {
            updates.status = status;
        }

        const user = await User.findByIdAndUpdate(
            id,
            updates,
            { new: true, runValidators: true }
        ).select(publicUserFields);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.json({
            message: 'User updated successfully',
            data: user
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Error updating user',
            error: error.message
        });
    }
};

module.exports = {
    getUsers,
    updateUser
};
