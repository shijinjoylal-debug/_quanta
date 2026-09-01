#include<stdio.h>
//malloc()=dynamic memory allocation
#include<stdlib.h>

int main(){

    int number;
    char *grades = {0};
    printf("enter the number of grades you have\n");
    scanf("%d", &number);

    grades = malloc(number * sizeof(char));
    if(grades == NULL){
        printf("memorry allocation failed!\n");
        return 1;
    }
    for(int i = 0; i < number; i++){
        printf("Enter the grade no.%d ", i+1);
        scanf(" %c", &grades[i]);
    }
    for(int i = 0; i < number; i++){
        printf("%c ", grades[i]);
    }

    free(grades);
    grades = NULL;
    
}