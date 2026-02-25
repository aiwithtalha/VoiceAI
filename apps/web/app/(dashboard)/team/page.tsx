'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import {
  Users,
  Plus,
  Mail,
  User,
  Crown,
  Shield,
  UserCircle,
  Eye,
  Trash2,
  MoreVertical,
  Clock,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';

const teamMembers = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john@example.com',
    role: 'owner',
    avatar: null,
    joinedAt: '2024-01-01T00:00:00Z',
    lastActiveAt: '2024-01-20T14:30:00Z',
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah@example.com',
    role: 'admin',
    avatar: null,
    joinedAt: '2024-01-05T00:00:00Z',
    lastActiveAt: '2024-01-20T10:15:00Z',
  },
  {
    id: '3',
    name: 'Mike Williams',
    email: 'mike@example.com',
    role: 'member',
    avatar: null,
    joinedAt: '2024-01-10T00:00:00Z',
    lastActiveAt: '2024-01-19T16:45:00Z',
  },
  {
    id: '4',
    name: 'Emily Davis',
    email: 'emily@example.com',
    role: 'viewer',
    avatar: null,
    joinedAt: '2024-01-15T00:00:00Z',
    lastActiveAt: null,
  },
];

const pendingInvites = [
  {
    id: '1',
    email: 'alex@example.com',
    role: 'member',
    invitedAt: '2024-01-19T00:00:00Z',
    expiresAt: '2024-01-26T00:00:00Z',
  },
];

const roleIcons = {
  owner: Crown,
  admin: Shield,
  member: UserCircle,
  viewer: Eye,
};

const roleLabels = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

export default function TeamPage() {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team</h1>
          <p className="text-slate-500">Manage team members and permissions</p>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>Members ({teamMembers.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-200">
            {teamMembers.map((member) => {
              const RoleIcon = roleIcons[member.role as keyof typeof roleIcons];
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.avatar || undefined} />
                      <AvatarFallback className="bg-indigo-100 text-indigo-700">
                        {member.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{member.name}</span>
                        {member.role === 'owner' && (
                          <Badge variant="default" className="text-xs">Owner</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">{member.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <RoleIcon className="h-4 w-4" />
                      {roleLabels[member.role as keyof typeof roleLabels]}
                    </div>
                    <div className="text-sm text-slate-400 hidden sm:block">
                      {member.lastActiveAt
                        ? `Active ${new Date(member.lastActiveAt).toLocaleDateString()}`
                        : 'Never active'}
                    </div>
                    {member.role !== 'owner' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Change Role</DropdownMenuItem>
                          <DropdownMenuItem className="text-rose-600">Remove</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invites ({pendingInvites.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-200">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                      <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <div>
                      <span className="font-medium text-slate-900">{invite.email}</span>
                      <p className="text-sm text-slate-500">
                        Expires {new Date(invite.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">
                      {roleLabels[invite.role as keyof typeof roleLabels]}
                    </Badge>
                    <Button variant="ghost" size="sm" className="text-rose-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Role Descriptions */}
      <Card className="bg-slate-50">
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-5 w-5 text-amber-500" />
                <span className="font-medium text-slate-900">Owner</span>
              </div>
              <p className="text-sm text-slate-500">
                Full access to all settings, billing, and team management
              </p>
            </div>
            <div className="p-4 bg-white rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-indigo-500" />
                <span className="font-medium text-slate-900">Admin</span>
              </div>
              <p className="text-sm text-slate-500">
                Can manage assistants, calls, and team members (except owners)
              </p>
            </div>
            <div className="p-4 bg-white rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <UserCircle className="h-5 w-5 text-slate-500" />
                <span className="font-medium text-slate-900">Member</span>
              </div>
              <p className="text-sm text-slate-500">
                Can create and manage assistants and view call logs
              </p>
            </div>
            <div className="p-4 bg-white rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-5 w-5 text-slate-400" />
                <span className="font-medium text-slate-900">Viewer</span>
              </div>
              <p className="text-sm text-slate-500">
                Read-only access to assistants and call logs
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your workspace
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="colleague@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Role
              </label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setInviteDialogOpen(false)}>
                <Mail className="mr-2 h-4 w-4" />
                Send Invite
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
