import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Search,
  Pencil,
  Download,
  ChevronDown,
  FileText,
  Paperclip,
  Loader2,
  Upload,
  ExternalLink,
} from "lucide-react";

type Booking = {
  id: number;
  name: string;
  phone: string;
  area: string;
  package: string;
  preferred_date: string | null;
  preferred_language: string | null;
  notes: string | null;
  age: number | null;
  gender: string | null;
  senior_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type Attachment = {
  id: number;
  booking_id: number;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string;
  created_at: string;
};

const STATUS_OPTIONS = ["pending", "confirmed", "paid", "cancelled", "completed"];

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
    case "confirmed":
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Confirmed</Badge>;
    case "paid":
      return <Badge className="bg-green-100 text-green-800 border-green-200">Paid</Badge>;
    case "cancelled":
      return <Badge className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>;
    case "completed":
      return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Completed</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export default function ConciergePage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/concierge", statusFilter],
    queryFn: async ({ queryKey }) => {
      const [_, status] = queryKey;
      const res = await fetch(`/api/concierge?status=${status}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return res.json();
    },
  });

  const { data: attachments, isLoading: attachmentsLoading } = useQuery<Attachment[]>({
    queryKey: ["/api/concierge", selectedBooking?.id, "attachments"],
    enabled: !!selectedBooking,
    queryFn: async () => {
      const res = await fetch(`/api/concierge/${selectedBooking!.id}/attachments`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch attachments");
      return res.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/concierge/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Status updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/concierge"] });
      setIsDetailOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: async ({ bookingId, file }: { bookingId: number; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/concierge/${bookingId}/attachments/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Attachment uploaded" });
      queryClient.invalidateQueries({
        queryKey: ["/api/concierge", selectedBooking?.id, "attachments"],
      });
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const openDetail = (booking: Booking) => {
    setSelectedBooking(booking);
    setEditStatus(booking.status);
    setIsDetailOpen(true);
  };

  const handleSave = () => {
    if (!selectedBooking) return;
    updateStatusMutation.mutate({ id: selectedBooking.id, status: editStatus });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedBooking) {
      uploadAttachmentMutation.mutate({ bookingId: selectedBooking.id, file });
    }
  };

  const filtered = bookings
    ? bookings.filter((b) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          b.name.toLowerCase().includes(q) ||
          (b.senior_name ?? "").toLowerCase().includes(q) ||
          b.phone.toLowerCase().includes(q) ||
          b.area.toLowerCase().includes(q)
        );
      })
    : [];

  return (
    <MainLayout title="SERI Concierge">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">SERI Concierge</h1>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search bookings..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Senior Name</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Preferred Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <TableRow key={i}>
                      {Array(9)
                        .fill(0)
                        .map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-6 w-full" />
                          </TableCell>
                        ))}
                    </TableRow>
                  ))
              ) : filtered.length > 0 ? (
                filtered.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="text-gray-500 text-sm">{booking.id}</TableCell>
                    <TableCell>
                      <div className="font-medium">{booking.senior_name || "-"}</div>
                      {booking.age && (
                        <div className="text-xs text-gray-500">
                          {booking.age} y/o{booking.gender ? ` · ${booking.gender}` : ""}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{booking.name}</TableCell>
                    <TableCell className="whitespace-nowrap">{booking.phone}</TableCell>
                    <TableCell>{booking.area}</TableCell>
                    <TableCell className="whitespace-nowrap">{booking.package}</TableCell>
                    <TableCell>
                      {booking.preferred_date
                        ? format(new Date(booking.preferred_date), "dd MMM yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(booking.status ?? "pending")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetail(booking)}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-1" />
                              Download
                              <ChevronDown className="h-3 w-3 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem disabled>
                              <FileText className="h-4 w-4 mr-2" />
                              Service Contract
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled>
                              <FileText className="h-4 w-4 mr-2" />
                              Liability Waiver
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    No bookings found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Booking Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[580px] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>Booking #{selectedBooking?.id}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {selectedBooking && (
              <>
                {/* Booking info */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide mb-0.5">Senior Name</p>
                    <p className="font-medium">{selectedBooking.senior_name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide mb-0.5">Age / Gender</p>
                    <p className="font-medium">
                      {selectedBooking.age ? `${selectedBooking.age} y/o` : "-"}
                      {selectedBooking.gender ? ` · ${selectedBooking.gender}` : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide mb-0.5">Requester</p>
                    <p className="font-medium">{selectedBooking.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide mb-0.5">Phone</p>
                    <p className="font-medium">{selectedBooking.phone}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide mb-0.5">Area</p>
                    <p className="font-medium">{selectedBooking.area}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide mb-0.5">Package</p>
                    <p className="font-medium">{selectedBooking.package}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide mb-0.5">Preferred Date</p>
                    <p className="font-medium">
                      {selectedBooking.preferred_date
                        ? format(new Date(selectedBooking.preferred_date), "dd MMM yyyy")
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wide mb-0.5">Language</p>
                    <p className="font-medium">{selectedBooking.preferred_language || "-"}</p>
                  </div>
                  {selectedBooking.notes && (
                    <div className="col-span-2">
                      <p className="text-gray-500 text-xs uppercase tracking-wide mb-0.5">Notes</p>
                      <p className="font-medium">{selectedBooking.notes}</p>
                    </div>
                  )}
                </div>

                {/* Status update */}
                <div>
                  <p className="text-sm font-medium mb-2">Status</p>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Attachments */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Attachments</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => attachmentInputRef.current?.click()}
                      disabled={uploadAttachmentMutation.isPending}
                    >
                      {uploadAttachmentMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-1" />
                      )}
                      Upload
                    </Button>
                    <input
                      ref={attachmentInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>

                  {attachmentsLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : attachments && attachments.length > 0 ? (
                    <ul className="space-y-1">
                      {attachments.map((att) => (
                        <li
                          key={att.id}
                          className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Paperclip className="h-4 w-4 shrink-0 text-gray-400" />
                            <span className="truncate">{att.file_name}</span>
                          </div>
                          {att.file_path.startsWith("http") ? (
                            <a
                              href={att.file_path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 shrink-0"
                            >
                              <ExternalLink className="h-4 w-4 text-gray-400 hover:text-gray-700" />
                            </a>
                          ) : (
                            <a href={att.file_path} download className="ml-2 shrink-0">
                              <Download className="h-4 w-4 text-gray-400 hover:text-gray-700" />
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400">No attachments yet.</p>
                  )}
                </div>
              </>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateStatusMutation.isPending}>
              {updateStatusMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
