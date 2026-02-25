'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import {
  Phone,
  Plus,
  Search,
  Trash2,
  Link as LinkIcon,
  Globe,
  MapPin,
  Check,
  Loader2,
} from 'lucide-react';
import { formatPhoneNumber } from '@/utils/format';

const phoneNumbers = [
  {
    id: '1',
    number: '+15551234567',
    provider: 'Twilio',
    country: 'US',
    region: 'California',
    assistantId: '1',
    assistantName: 'Sales Assistant',
    status: 'active',
    monthlyCost: 1.15,
  },
  {
    id: '2',
    number: '+15559876543',
    provider: 'Twilio',
    country: 'US',
    region: 'New York',
    assistantId: '2',
    assistantName: 'Support Bot',
    status: 'active',
    monthlyCost: 1.15,
  },
  {
    id: '3',
    number: '+15554567890',
    provider: 'Vonage',
    country: 'US',
    region: 'Texas',
    assistantId: '3',
    assistantName: 'Booking Agent',
    status: 'inactive',
    monthlyCost: 0.99,
  },
];

const availableNumbers = [
  '+15552345678',
  '+15553456789',
  '+15554567890',
  '+15555678901',
  '+15556789012',
];

export default function PhoneNumbersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [areaCode, setAreaCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<string[]>([]);

  const handleSearch = async () => {
    setIsSearching(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSearchResults(availableNumbers);
    setIsSearching(false);
  };

  const filteredNumbers = phoneNumbers.filter(
    (n) =>
      n.number.includes(searchQuery) ||
      n.assistantName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Phone Numbers</h1>
          <p className="text-slate-500">Manage your phone numbers and assignments</p>
        </div>
        <Button onClick={() => setBuyDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Buy Number
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search numbers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* Numbers List */}
      <div className="space-y-4">
        {filteredNumbers.map((number) => (
          <Card key={number.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
                    <Phone className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-lg">
                      {formatPhoneNumber(number.number)}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-slate-500 flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {number.country}
                      </span>
                      <span className="text-sm text-slate-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {number.region}
                      </span>
                      <Badge variant="secondary">{number.provider}</Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Assigned to</p>
                    <p className="font-medium text-slate-900">
                      {number.assistantName || 'Unassigned'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Monthly cost</p>
                    <p className="font-medium text-slate-900">
                      ${number.monthlyCost.toFixed(2)}
                    </p>
                  </div>
                  <Badge
                    variant={number.status === 'active' ? 'success' : 'secondary'}
                  >
                    {number.status}
                  </Badge>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <LinkIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="text-rose-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Buy Number Dialog */}
      <Dialog open={buyDialogOpen} onOpenChange={setBuyDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Buy a Phone Number</DialogTitle>
            <DialogDescription>
              Search for available numbers by area code
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="flex gap-3">
              <Input
                placeholder="Area code (e.g., 415)"
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value)}
                maxLength={3}
              />
              <Button onClick={handleSearch} isLoading={isSearching}>
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Available Numbers</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {searchResults.map((number) => (
                    <div
                      key={number}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-colors cursor-pointer"
                    >
                      <span className="font-medium text-slate-900">
                        {formatPhoneNumber(number)}
                      </span>
                      <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Buy ($1.15/mo)
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
