import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import UserForm from "@/components/users/user-form";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Plus, Search, Key, AlertCircle, Loader2 } from "lucide-react";

export default function UsersPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  // Fetch users data
  const { data: users, isLoading } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: currentUser?.role === 'admin',
  });

  // Filter users based on search
  const filteredUsers = users
    ? users.filter((user: any) => {
        return searchQuery === "" || 
          user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.fullName.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : [];

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: number, password: string }) => {
      return await apiRequest("PUT", `/api/users/${id}/password`, { password });
    },
    onSuccess: () => {
      toast({
        title: "Password reset",
        description: "The user's password has been reset to default123",
      });
      setIsResetPasswordDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openForm = (user: any = null) => {
    setSelectedUser(user);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setSelectedUser(null);
    setIsFormOpen(false);
  };

  const openResetPasswordDialog = (user: any) => {
    setSelectedUser(user);
    setIsResetPasswordDialogOpen(true);
  };

  const handleResetPassword = () => {
    if (selectedUser) {
      resetPasswordMutation.mutate({ 
        id: selectedUser.id, 
        password: "default123" 
      });
    }
  };

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'admin':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Admin</Badge>;
      case 'staff':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Staff</Badge>;
      case 'user':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">User</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  return (
    <MainLayout title="User Management">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
        <Button onClick={() => openForm()} className="flex items-center">
          <Plus className="h-5 w-5 mr-1" />
          Add User
        </Button>
      </div>
      
      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Users Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-8 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[150px] ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.fullName}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{format(new Date(user.createdAt), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openForm(user)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openResetPasswordDialog(user)}
                      >
                        <Key className="h-4 w-4 mr-1" />
                        Reset Password
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                    No users found matching search
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      
      {/* User Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>
              {selectedUser ? 'Edit User' : 'Add New User'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <UserForm 
              user={selectedUser}
              onClose={closeForm}
            />
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent className="p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Are you sure you want to reset the password for this user?
            </DialogDescription>
          </DialogHeader>
          <div className="px-6">
            <div className="flex items-center gap-2 py-3">
              <AlertCircle className="h-6 w-6 text-yellow-500" />
              <p className="text-sm text-gray-700">
                The password will be reset to <strong>default123</strong>
              </p>
            </div>
            {selectedUser && (
              <div className="py-2">
                <p><span className="font-medium">User:</span> {selectedUser.fullName}</p>
                <p><span className="font-medium">Username:</span> {selectedUser.username}</p>
              </div>
            )}
          </div>
          <DialogFooter className="px-6 pb-6">
            <Button 
              variant="outline" 
              onClick={() => setIsResetPasswordDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleResetPassword}
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
