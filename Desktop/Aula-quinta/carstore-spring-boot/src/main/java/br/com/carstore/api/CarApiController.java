package br.com.carstore.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class CarApiController {

    @GetMapping("/cars")
    public ResponseEntity<List<Map<String, Object>>> listCars() {
        List<Map<String, Object>> cars = List.of(
                Map.of("id", 1, "brand", "Toyota", "model", "Corolla", "year", 2023),
                Map.of("id", 2, "brand", "Honda",  "model", "Civic",   "year", 2022),
                Map.of("id", 3, "brand", "Ford",   "model", "Mustang", "year", 2024)
        );
        return ResponseEntity.ok(cars);
    }

}
