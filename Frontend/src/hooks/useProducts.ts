import { useQuery } from '@tanstack/react-query';
import { productService } from '@/services/productService';

export const useProducts = () => {
    return useQuery({
        queryKey: ['products'],
        queryFn: productService.getAll,
    });
};

export const useProductVariants = () => {
    return useQuery({
        queryKey: ['productVariants'],
        queryFn: productService.getAllVariants,
    });
};
