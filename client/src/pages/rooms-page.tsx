import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import RoomForm from "@/components/rooms/room-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Badge,
} from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search } from "lucide-react";
import { Room } from "@shared/schema";

export default function RoomsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all_types");
  const [statusFilter, setStatusFilter] = useState<string>("all_statuses");
  const [page, setPage] = useState(1);

  // Fetch rooms data
  const { data: rooms, isLoading } = useQuery({
    queryKey: ["/api/rooms"],
  });

  // Filter data based on search and filters
  const filteredRooms = rooms
    ? rooms.filter((room: Room) => {
        const matchesSearch = searchQuery === "" || 
          room.unitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          room.description?.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesType = typeFilter === "all_types" || room.roomType === typeFilter;
        const matchesStatus = statusFilter === "all_statuses" || room.status === statusFilter;
        
        return matchesSearch && matchesType && matchesStatus;
      })
    : [];

  // Pagination
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil((filteredRooms?.length || 0) / ITEMS_PER_PAGE);
  const paginatedRooms = filteredRooms.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const openForm = (room: Room | null = null) => {
    setSelectedRoom(room);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setSelectedRoom(null);
    setIsFormOpen(false);
  };

  const formatRoomType = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  };

  const renderStatusBadge = (status: string) => {
    switch(status) {
      case 'vacant':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Vacant</Badge>;
      case 'occupied':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Occupied</Badge>;
      case 'maintenance':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Maintenance</Badge>;
      case 'reserved':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">Reserved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <MainLayout title="Room Management">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Room Management</h1>
        <Button onClick={() => openForm()} className="flex items-center">
          <Plus className="h-5 w-5 mr-1" />
          Add Room
        </Button>
      </div>
      
      {/* Filters and search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4">
            <div className="w-full md:w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search rooms..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="w-full md:w-auto flex flex-wrap gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all_types">All Types</SelectItem>
                    <SelectItem value="studio">Studio</SelectItem>
                    <SelectItem value="studio_deluxe">Studio Deluxe</SelectItem>
                    <SelectItem value="1_bedroom">1-Bedroom</SelectItem>
                    <SelectItem value="2_bedroom">2-Bedroom</SelectItem>
                    <SelectItem value="3_bedroom">3-Bedroom</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all_statuses">All Statuses</SelectItem>
                    <SelectItem value="vacant">Vacant</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Rooms Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Floor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Monthly Rate</TableHead>
                <TableHead>Resident</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-8 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[60px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[100px] ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedRooms.length > 0 ? (
                paginatedRooms.map((room: Room) => {
                  const resident = room.occupancy?.find((o: any) => o.active)?.resident;
                  
                  return (
                    <TableRow key={room.id}>
                      <TableCell className="font-medium">{room.unitNumber}</TableCell>
                      <TableCell>{formatRoomType(room.roomType)}</TableCell>
                      <TableCell>{room.size} sq ft</TableCell>
                      <TableCell>{room.floor}</TableCell>
                      <TableCell>{renderStatusBadge(room.status)}</TableCell>
                      <TableCell>RM {room.monthlyRate.toLocaleString()}</TableCell>
                      <TableCell>
                        {resident ? (
                          <span className="text-gray-900">{resident.fullName}</span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        <button 
                          onClick={() => openForm(room)}
                          className="text-primary-600 hover:text-primary-900 mr-3"
                        >
                          View
                        </button>
                        <button 
                          onClick={() => openForm(room)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Edit
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-gray-500">
                    No rooms found matching filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        {!isLoading && totalPages > 0 && (
          <div className="border-t border-gray-200 px-4 py-3">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 1) setPage(page - 1);
                    }}
                  />
                </PaginationItem>
                
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (page <= 3) {
                    pageNumber = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = page - 2 + i;
                  }
                  
                  return (
                    <PaginationItem key={i}>
                      <PaginationLink 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(pageNumber);
                        }}
                        isActive={pageNumber === page}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                {totalPages > 5 && page < totalPages - 2 && (
                  <>
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink 
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(totalPages);
                        }}
                      >
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  </>
                )}
                
                <PaginationItem>
                  <PaginationNext 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < totalPages) setPage(page + 1);
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            <div className="text-sm text-gray-700 text-center mt-2">
              Showing {Math.min((page - 1) * ITEMS_PER_PAGE + 1, filteredRooms.length)} to {Math.min(page * ITEMS_PER_PAGE, filteredRooms.length)} of {filteredRooms.length} rooms
            </div>
          </div>
        )}
      </Card>
      
      {/* Room Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {selectedRoom ? 'Edit Room' : 'Add New Room'}
            </DialogTitle>
          </DialogHeader>
          <RoomForm 
            room={selectedRoom}
            onClose={closeForm}
          />
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
